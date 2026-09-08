# Kagombe latency investigation (Uganda S2 History v0.1, Part 2)

## Incident

During the August 2026 Uganda country pass, 655 of 656 CFR jobs completed in
single-digit-to-double-digit seconds. One job -- **Kagombe** (30,063 ha,
Kabarole/Kyenjojo area) -- took **5,578.29 seconds (92.97 minutes)** for a
single, un-retried Earth Engine evaluation (`attempts = 1`, no error).

## Method

Queried the persisted `processing.eo_job`, `geo.aoi_version`,
`geo.geometry_observation`, and `observations.eo_observation` rows for
Kagombe directly from the populated `ea_forests_uganda_country_pass`
database (job id `d894c1fc-2191-4158-a478-3c400081e872`), and compared them
against the next three slowest successful jobs from the same run by every
dimension available: area, vertex count, ring count, geometry validity,
acquisition/eligible-acquisition counts, and the jobs immediately before and
after Kagombe in execution order (to check for surrounding system
contention). No live re-execution of Kagombe was performed; this is an
analysis of the already-persisted run.

## Findings

| CFR | Area (ha) | Vertices | Rings | Runtime (s) | Acquisitions | Eligible |
|---|---|---|---|---|---|---|
| **Kagombe** | **3,006.3** *(30,063 ha)* | **605** | 1 | **5,578.29** | 40 | 37 |
| Kasyoha - Kitomi | 38,461 | 1,762 | 1 | 94.47 | 20 | 17 |
| Budongo | 81,788 | 1,035 | 1 | 32.08 | 40 | 39 |
| Mabira | 31,658 | 1,294 | 1 | 29.55 | 20 | 20 |

(Area column shows the raw `area_m2` value queried; Kagombe's true area is
30,063 ha as reported in the original incident, confirmed via
`area_m2 = 300,632,297 m2`.)

- **Area**: not the cause. Kasyoha-Kitomi (larger) ran in 94s; Budongo (2.7x
  Kagombe's area) ran in 32s.
- **Geometry complexity**: not the cause. Kagombe has *fewer* vertices (605)
  than all three comparison CFRs, a single valid ring, and
  `ST_IsValid = true`.
- **Acquisition/eligible count**: not the cause. Kagombe's 40
  acquisitions / 37 eligible is unremarkable -- Budongo had the *same*
  acquisition count (40/39) and ran 174x faster.
- **QA outcome**: normal. `usable_observation_fraction = 0.9996`,
  `outcome = success`, `reason_codes = []` -- scientifically indistinguishable
  from any other successful CFR.
- **Surrounding system load**: no evidence of a broader stall. The job
  immediately before Kagombe (Echuya) completed normally at 13:24:50.879;
  Kagombe's job started 23ms later (13:24:50.902); the job immediately after
  (North Maramagambo) started normally at 14:58:04.655 (right after Kagombe
  completed at 14:57:49.195) and ran in a normal 26.0s. The slowdown is
  strictly confined to Kagombe's own evaluation window -- nothing before or
  after it was affected.

## Conclusion

**No demonstrable cause was found** in area, geometry complexity, acquisition
count, QA outcome, or surrounding system load. This is consistent with an
isolated, non-reproducible Earth Engine-side or network-side stall on that
one evaluation, not a defect in the request, the geometry, or the pipeline
code. Per instruction, no cause is asserted beyond what the data supports.

## Action taken

The goal is not to "fix" this specific incident (there is nothing
demonstrated to fix) but to ensure one pathological evaluation cannot block
national processing indefinitely, regardless of cause. See
`backend/app/services/eo/reliability.py`:

- A real, transport-level **provider deadline** (`ee.data.setDeadline`,
  120s default) now bounds every individual Earth Engine API call. Verified
  live against `ee-oyugijason`: a tightened deadline surfaces as a builtin
  `TimeoutError` raised from `ee`'s own request wrapper
  (`ee/_cloud_api_utils.py`), confirming this controls the actual underlying
  HTTP read timeout -- not a `Future.result(timeout=...)` racing an
  uncontrolled background call. A full analysis makes at most 3 such calls
  (1 discover + 2 extract), so this structurally bounds Earth-Engine-call
  time to well under the work-unit budget below.
- A distinct **work-unit deadline** (600s / 10 minutes default) bounds the
  whole discover+extract call per job, enforced as a cooperative
  post-execution check (not a second thread) -- a `Session` is not
  thread-safe, so racing `run_analysis` against a timeout from another
  thread risked corrupting in-flight transaction state.
- Bounded **retry with exponential backoff + jitter** (max 3 attempts,
  unchanged) now actually waits between attempts (`retry_not_before`) rather
  than being immediately reclaimable.
- A **per-attempt audit trail** (`processing.eo_job_attempt`, append-only)
  records every attempt's outcome/reason/timing so a timed-out attempt is
  never silently overwritten by a later successful one.
- A small **in-process circuit breaker** pauses new job claims for a cooldown
  period if several transient provider failures land in a short window,
  without hammering Earth Engine or adding new infrastructure.

If a Kagombe-type stall recurs during the 12-month history backfill, it will
now surface as a `PROVIDER_TIMEOUT`-classified, bounded (~120s), retried
(up to 3x with backoff) event -- visible in `eo_job_attempt` and the run's
telemetry -- rather than a ~93-minute unbounded block.
