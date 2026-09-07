# Uganda Sentinel-2 vertical-slice pilot report

Live run against project `ee-oyugijason`, 2026-09-07. This is the first real
EO evidence path (canonical CFR -> exact AOI version -> durable job -> real
Sentinel-2 discovery -> pinned source items -> versioned processing run -> QA
-> per-acquisition features -> monthly composite -> area-weighted AOI
statistics -> immutable EO observation/feature result), not a mock.

## Pilot selection

Chosen by quantitative rule from the 656 EO-processable CFRs (never by
result attractiveness): smallest workable polygon, the median by area, the
largest, and one area-discrepancy-flagged CFR (`backend/scripts/run_eo_pilot.py:select_pilot_cfrs`).

| Role | CFR | Polygon area (ha) |
| --- | --- | --- |
| small | Mala Island | 1.2 |
| medium | Epor | 223.5 |
| large | Zulia | 92,559.3 |
| area-discrepancy-flagged | Katabalalu | 1,786.5 |

Recipe `s2-sr-optical-v1` / QA `s2-qa-scl-core/1` / statistics `moments-v1`,
20 m UTM grid (`EPSG:32636`, zone 36N). Month selection: discovery probed
August 2026 (the most recent complete calendar month at run time) on the
medium CFR first; it returned data, so all single-month runs use August
2026. A 3-consecutive-month series (June, July, August 2026) ran on the
medium CFR to prove the series contract.

## Results

| Work unit | Acquisitions found / eligible | Usable coverage | Duration |
| --- | --- | --- | --- |
| Epor, Aug 2026 (probe) | 20 / 18 | 100% | 8.3 s |
| Mala Island, Aug 2026 | 10 / 8 | 100% | 2.7 s |
| Zulia, Aug 2026 | 22 / 20 | 99.999% | 20.8 s |
| Katabalalu, Aug 2026 | 10 / 10 | 100% | 3.6 s |
| Epor, Jul 2026 | 18 / 12 | 100% | 2.8 s |
| Epor, Jun 2026 | 18 / 17 | 100% | 3.0 s |

All six succeeded (software job status `succeeded`; scientific outcome
`success` in every case here). Zulia (92,559 ha, ~2.32M target cells) needed
no internal sharding: Earth Engine's own `reduceRegion` handled the AOI in
one call within `maxPixels=1e8`, in under 21 seconds. The section-16 work-unit
limits (~5,000 ha / one AOI / one month) are a submission-cost/predictability
policy for national-scale scheduling, not evidence that larger single CFRs
are technically infeasible in one call; sharding + `merge_shard_statistics`
(pooled weighted mean/variance, tested) exists and will matter once many
large CFRs run concurrently and jobs need bounding, but this pilot did not
need to exercise it live.

### Example result: Epor, August 2026

| Feature | Mean | SD | Valid / total pixels |
| --- | --- | --- | --- |
| NDVI | 0.622 | 0.154 | 5,776 / 5,776 |
| NDMI | 0.057 | 0.139 | 5,776 / 5,776 |
| NBR | 0.271 | 0.193 | 5,776 / 5,776 |

18 acquisitions found, 18 eligible, 100% usable coverage, QA profile
`s2-qa-scl-core/1`, 18 exact `COPERNICUS/S2_SR_HARMONIZED` source items
relationally pinned via `processing.input`. AOI version, geometry hash, grid
(`EPSG:32636`, 20 m), recipe/QA/statistics profile versions, and the full
discovery manifest are all retained on the immutable
`observations.eo_observation` row and its producing `processing.run`.

## A real bug the pilot caught

The first pilot run failed a database CHECK constraint:
`usable_observation_fraction` came out as `1.0349` (>1) for Epor. Root cause:
`total_pixel_count` and `valid_pixel_count` were computed via two
**independent** `reduceRegion` calls; even with identical `crs`/`scale`/
`geometry`, Earth Engine's internal tiling can rasterize a handful of
boundary pixels differently between separate calls. Fixed by adding an
always-valid `total_pixels` band to the *same* image used for the feature
statistics, so both counts come from one rasterization pass, plus a
defensive `[0,1]` clamp as a second line of defense
(`app/services/eo/ee_provider.py`). Re-run after the fix: all coverage
fractions valid, one value at `0.999991` (a handful of masked boundary
pixels on Zulia), never above 1. This is exactly the kind of defect a real
pilot is supposed to surface before scaling to 656 CFRs.

## Independent spot-check

`backend/scripts/spot_check_eo_pilot.py` pulled raw per-pixel NDVI values
for Mala Island (the smallest CFR) via `ee.Image.sample()` and recomputed
the mean independently with `app/services/eo/stats.py`, comparing against
the persisted `reduceRegion`-derived result:

| | Pixels | Mean | Variance |
| --- | --- | --- | --- |
| Independent `sample()` pull | 28 | -0.0926 | 0.00041 |
| Persisted `reduceRegion` result | 43 | -0.0899 | 0.00169 |

Means agree closely (difference 0.0027, ~3% relative). Pixel *counts*
disagree substantially (28 vs 43) for this very small (~1.2 ha) AOI --
`sample()` and `reduceRegion()` are different EE algorithms with different
internal pixel-center/tiling logic, and the disagreement is proportionally
large only because the AOI is a handful of pixels wide. **This is an open
issue, not a resolved one**: small-AOI (roughly <50-pixel) results should be
treated with extra caution until validated against a third method or
higher-resolution ground truth; it does not affect the medium/large CFRs
(Epor, Zulia), whose scientific outcome and coverage numbers this spot-check
does not call into question.

## Scale estimate (rough, stated assumptions, not a scheduling commitment)

Measured: 2.7-3.6 s per small/medium CFR-month; 20.8 s for the one very
large CFR; all on a single warm worker process making sequential live EE
calls, no parallelism, "moments-v1" statistics only, no enhanced QA, no
raster export.

Assuming ~96% of the 656 CFRs behave like the small/medium cases (~3.5 s)
and the remaining ~4% behave like the large case (~20 s), sequential on one
worker:

- **656 CFRs x 1 month** ~= 656 x 0.96 x 3.5 s + 656 x 0.04 x 20 s ~= 2,200 +
  525 s ~= **~45 minutes**
- **656 CFRs x 12 months** ~= 12 x that ~= **~9 hours**
- **656 CFRs x 24 months** ~= **~18 hours**

The task's stated worker bound (max 2 concurrent EE evaluations) would
roughly halve these. These are order-of-magnitude planning numbers from six
live work units, not a validated production estimate: EE quota/backoff
behavior under sustained load, larger CFRs' actual distribution, and
enhanced-QA cost are all unmeasured. No backfill was launched.
