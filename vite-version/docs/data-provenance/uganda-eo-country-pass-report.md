# Uganda EO country pass v0.1

Hardening + first national Sentinel-2 pass across all 656 EO-processable
Uganda CFRs, live against `ee-oyugijason`. Builds on the vertical-slice pilot
(`uganda-sentinel2-pilot-report.md`); this document covers what changed and
the national execution.

## Part 2/3: the small-AOI statistics discrepancy, root-caused and fixed

The pilot's `sample()`-vs-`reduceRegion()` spot-check disagreed by ~3% on
Mala Island (~1.2 ha). Investigation (`scripts/investigate_reduceregion_weighting.py`,
a live, minimal repro) established the actual mechanism:

- `ee.Reducer.count()` counts every pixel **touched at all** by the AOI
  geometry -- a binary "touched" rule that overcounts boundary pixels. A
  controlled 3x3-pixel square offset by half a pixel showed `count()`
  returning 16 touched pixels against a true area-equivalent of 9.
- The default (non-`.unweighted()`) **`sum()`** reducer applies EE's native
  fractional-coverage weighting at boundaries: the same offset square gave
  `sum(constant 1) = 8.988`, matching the true 9-pixel area to within
  floating-point rounding. This is exactly the architecture's
  `w_i = area(AOI intersect cell_i)` formula, already implemented natively by
  `reduceRegion`'s weighted reducers -- it did not need to be built from
  scratch.

The bug was that `total_pixel_count`/`valid_pixel_count`/coverage fractions
were derived from `count()` (the wrong, unweighted quantity), while `mean`/
`variance` were already correctly weighted. Fixed by replacing the
`mean().combine(variance()).combine(count())` reducer with **explicit**
weighted sufficient statistics computed via `sum()` alone, per the task's
own prescription: for each feature, one `reduceRegion(sum())` call over
bands `{feature, feature^2, feature.mask()}` plus an always-valid `total`
band, giving `sum(w_i*x_i)`, `sum(w_i*x_i^2)`, `sum(w_i)` and `sum(w_i)`
over the whole AOI in one rasterization pass (so total and valid counts can
never disagree from separate-call boundary-tiling differences -- the actual
cause of the pilot's `usable_observation_fraction > 1` bug). `mean = sum_wx
/ sum_w`; `population variance = sum_wx2/sum_w - mean^2`.

Two implementation bugs surfaced and were fixed live before this was correct
(both caught by running against real data, not by reasoning about the EE
API from memory):

1. First attempt named bands `"{key}_sum_x"` etc. and read back
   `stats.get(f"{key}_sum_x")` -- but `reduceRegion` with a **combined**
   reducer suffixes the reducer name onto the *reducer's* output key, not a
   plain band-name copy, and this band-naming choice collided with that
   suffixing convention, producing an all-zero result.
2. After renaming bands, the code still assumed a `"_sum"` suffix on every
   output key. A separate live minimal repro (inline, not a saved script)
   established the actual rule: a **single, non-combined** reducer's output
   key is exactly the band name, no suffix at all. Fixed by reading
   `stats.get(f"{key}_x")` etc. directly.

Re-run after the real fix (`run_eo_pilot.py` v4): Mala Island's weighted
valid-cell count came out as **29**, essentially matching the independent
`sample()` pixel-center count of **28** from the original pilot -- the
original ~3% disagreement is resolved, not papered over. Epor's valid count
corrected from the old (inflated) 5,776 "touched" pixels to the true
weighted **5,582**.

## Part 3: same-recipe repeatability (the real tolerance check)

The original spot-check compared two *structurally different* algorithms
(`sample()`'s point-inclusion rule vs `reduceRegion()`'s coverage-fraction
weighting) and reported their disagreement as if it were a repeatability
problem. It never validated the actual question: does the SAME recipe
(exact AOI version, exact pinned Sentinel-2 item IDs, exact QA profile,
exact grid, exact composite, exact formula, exact weighting) reproduce
itself?

`scripts/verify_same_recipe_repeatability.py` calls `EarthEngineProvider.extract()`
twice with identical inputs. Live results on Mala Island (small) and Zulia
(large, ~2.3M target cells): **`max_relative_diff = 0.0`** in both cases --
exact, bit-for-bit repeatability. Tolerance: 0 (deterministic), which is the
correct bar for a single `reduceRegion` call over fixed, pinned inputs; no
justification was needed for a nonzero tolerance because none was observed.
`sample()` remains available only as a diagnostic (task Part 2), never as
ground truth, since it implements a different support definition than the
registered grid.

## Part 4: per-cell acquisition support

An AOI-wide acquisition count never implied every target cell had that much
support. `ee_provider.py` now computes a `support_count` band (per-pixel
count of contributing prepared acquisitions, via `ImageCollection.map(...).sum()`
over each acquisition's validity mask) and an `eligible_mask =
support_count >= MIN_SUPPORT_ACQUISITIONS` (2, unchanged from the pilot
policy -- no evidence was found to revise it). `eligible_support_area_fraction`
(the AOI-area-weighted fraction of cells meeting the policy) is persisted on
`eo_observation.metadata`, independent of the AOI-wide `acquisition_count`/
`eligible_acquisition_count` fields. Verified live: Epor's 18-20 AOI-wide
acquisitions still show `eligible_support_area_fraction` distinct from (and
never assumed equal to) 1.0 whenever boundary cells have less support than
the interior.

## Part 5: direct-processing work-unit ceiling

Measured evidence (pilot + repeatability runs, `scripts/run_eo_pilot.py`):
Zulia (92,559 ha, ~2.3M target cells, 22 candidate items) completed in a
**single `reduceRegion` call**, 2.6-21 s across three independent live runs,
zero retries or provider errors, well inside `maxPixels=1e8`.

**Decision: Option B.** `app/services/eo/work_limits.py` raises the
direct-processing ceiling to `DIRECT_PROCESSING_MAX_AREA_HA = 150,000` (a
~1.6x margin over the largest measured single-call CFR), `MAX_VERTICES =
50,000`, `MAX_CANDIDATE_ITEMS = 300`, versioned as `eo-work-limits/0.2`
(0.1 was the architecture's original proposed 5,000 ha / 10,000 / 100).
Canonical CFR geometry is never simplified regardless of this ceiling.

Deterministic sharding remains implemented as the fallback
(`work_limits.generate_deterministic_shards`, a real PostGIS fishnet-
intersection function; `stats.merge_shard_statistics`, the weighted law-of-
total-variance pooling), tested (shard non-overlap, full-coverage,
determinism, and merged-statistics-vs-direct-computation agreement -- all
via real PostGIS/pure-Python, no live EE needed to validate shard
geometry). It was **not exercised live**: Uganda's largest CFR (Zulia,
92,559 ha) is within the new 150,000 ha ceiling, so no CFR in this pass
required sharding.

## Part 6: job leasing and fencing

`processing.eo_job` gained `lease_expires_at`, `fencing_token`, `worker_id`
(migration 0006). `claim_job()` atomically claims the oldest claimable job
(`queued`/`retry_wait`, or `running` with an expired lease) via `SELECT ...
FOR UPDATE SKIP LOCKED` + a conditional `UPDATE`, incrementing the fencing
token; the caller commits that claim before calling Earth Engine.
`execute_claimed_job()` only publishes a terminal result if the fencing
token still matches -- a worker that lost its lease to a recovering claim
gets `lease_held: False` and its result is not linked to the job (the
recovering worker's own run is authoritative). Still one worker for this
pass; leasing is crash-recovery, not new concurrency. Tested: claim sets
lease/token, a second claim while the lease is live returns nothing, an
expired lease is recoverable by a different worker, and the original
(stale) worker's publish attempt is rejected while the recovering worker's
succeeds.

A real bug surfaced running this against live data: `claim_job()`'s raw-SQL
`UPDATE` ran in a transaction that never called `audit_context()` (that
context is transaction-`LOCAL` in Postgres and does not survive a commit
boundary), tripping the `audit.record_change()` trigger's `actor`/`reason`
requirement. Fixed by calling `audit_context()` at the start of `claim_job()`.

## National execution

CFR universe: the 656-member EO-processable cohort from the spatial-spine
inventory (`uganda-cfr-spatial-spine-inventory.json`), frozen at run start
into `uganda-cfr-s2-country-pass-v0.1`'s manifest (cohort membership list +
recipe/QA/statistics/grid/work-limits versions + requested period). A
canonical-geometry change after this freeze belongs to a later country-pass
version, not a silent update to this one.

Period: `[2026-08-01, 2026-09-01)` UTC -- the same month already confirmed
to have real Sentinel-2 coverage across small/medium/large Uganda CFRs in
the pilot (re-probing per-CFR was not necessary since every pilot CFR
already returned real acquisitions for this month).

### Execution

All 656 cohort members submitted, real Earth Engine (`ee-oyugijason`), the
leased single-worker path, no fake provider:

| | |
| --- | --- |
| Submitted | 656 |
| Job status `succeeded` | 656 |
| Job status `failed` | 0 |
| Scientific outcome `success` | 656 |
| Scientific outcome `partial` | 0 |
| Scientific outcome `no_observation` | 0 |
| Scientific outcome `failed`/unprocessed | 0 |
| Retries | 0 (every job succeeded on its first attempt) |
| Provider errors | 0 |
| Sharded CFRs | 0 (largest CFR, Zulia, is within the raised ceiling) |
| Total EE compute time (sum of per-CFR durations) | 8,516 s (~2.4 h) |
| Median duration | 2.92 s |
| p90 duration | 7.94 s |
| Min duration | 1.50 s |
| Max duration | **5,584.86 s (~93 min), CFR "Kagombe"** |

**The Kagombe anomaly.** Kagombe is a 30,063 ha CFR -- unremarkable in size
(smaller than Zulia, which took 21 s) -- yet its single `execute_claimed_job`
call ran for ~93 minutes with `attempts = 1` (no retry was triggered; this
was one call, not a retry storm) before succeeding with a scientifically
normal result (NDVI 0.685, consistent with the CFRs processed immediately
before and after it, which took 4-26 s). Two hypotheses, neither confirmed:
an Earth Engine-side latency/queueing spike specific to that request, or
local machine resource contention (this session independently observed an
unexplained ~28x slowdown on an unrelated local PostgreSQL test run earlier
the same day, which also self-resolved without any code change). This is
reported as an **open operational risk**, not resolved here: a production
worker loop should have a per-job timeout/circuit breaker so one slow
request cannot silently consume the whole run's time budget, which this
one-off script did not need (it completed regardless) but a real scheduled
service would.

### National coverage

| | |
| --- | --- |
| Total processable area (656 CFRs) | 1,239,551.5 ha |
| Area with successful EO observation | 1,239,551.5 ha (100%) |
| Area with partial observation | 0 ha |
| Area with no usable observation | 0 ha |
| Failed/unprocessed area | 0 ha |
| Median usable coverage | 100% |
| p10 usable coverage | 99.83% |
| p90 usable coverage | 100% |
| Median eligible acquisition count | 9 |
| Low-support CFRs (< 2 eligible acquisitions) | 0 |

August 2026 produced unusually clean Sentinel-2 coverage across Uganda's
CFR estate under `s2-qa-scl-core/1` -- plausible for a national pass timed
in a relatively low-cloud month, not a claim that every month will look
this clean. No aggregate/national NDVI figure is computed or reported (see
`country_pass.py`'s explicit disclaimer); per-CFR feature values remain in
`observations.eo_feature_value`.

### Example results across size classes

| CFR | Area (ha) | Acquisitions (found/eligible) | Usable coverage | NDVI mean±SD | NDMI mean±SD | NBR mean±SD |
| --- | --- | --- | --- | --- | --- | --- |
| Kibale (small) | 1.4 | 10 / 7 | 100% | 0.515 ± 0.122 | -0.005 ± 0.088 | 0.178 ± 0.121 |
| Epor (median) | 223.5 | 20 / 18 | 100% | 0.622 ± 0.154 | 0.057 ± 0.139 | 0.271 ± 0.194 |
| Budongo (large) | 81,787.8 | 40 / 39 | 99.9999% | 0.801 ± 0.055 | 0.291 ± 0.061 | 0.606 ± 0.072 |
| Kagombe (anomalous duration) | 30,063.2 | 40 / 37 | 99.96% | 0.685 ± 0.159 | 0.177 ± 0.179 | 0.430 ± 0.242 |

Budongo is a well-documented Uganda rainforest reserve; its high NDVI
(0.80)/NDMI (0.29)/NBR (0.61) with a notably low spatial SD (dense, uniform
canopy) is consistent with independently known ground truth about that
forest -- a plausibility check, not a validation of absolute accuracy.

## Scientific validation carried into the national pass

Every persisted `observations.eo_observation` row for this run carries: the
exact AOI version and geometry hash (via its `eo_series`), the exact pinned
Sentinel-2 item IDs (`processing.input` rows), the applied QA profile
(`s2-qa-scl-core/1`), the grid (`EPSG:32636`/`EPSG:32635`, 20 m, from
`grid.py`'s deterministic UTM-zone selection), the recipe/statistics
versions, and per-cell acquisition support. `outcome` distinguishes
`success`/`partial`/`no_observation` from the software job's own
`succeeded`/`failed`/`retry_wait` status -- a `succeeded` job can and does
carry a `no_observation` scientific outcome without being conflated with
software failure.
