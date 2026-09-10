# Sentinel-1 stream identity: orbit direction and relative orbit

Date: 2026-09-09. Real audit against the live Uganda national backfill
(`backend/scripts/analyze_s1_relative_orbit.py`, output:
`outputs/eo/s1_relative_orbit_audit.json`) -- 1,504 real acquired scenes
across 478 real CFR/direction pairs, at the point this was run. **This is
based on partial history (three real months so far: 2025-09 in progress,
plus small non-national 2026-06 pilot rows, plus 2026-08 just launched) --
re-run the script and revisit the numbers, not the reasoning, once more
months complete.**

## Background

Sentinel-1's 12-day repeat orbit means a given ground point is revisited
by a small, usually fixed set of **relative orbit numbers** per pass
direction (ascending/descending) -- distinct from the direction itself.
Two acquisitions of the same relative orbit share incidence geometry;
two different relative orbits over the same point generally do not (the
look angle differs). This is why the question matters independently of
ascending vs. descending, which the pipeline already keeps separate
(`s1-grd-backscatter-ascending-v1` / `-descending-v1`).

## What the real data shows

- **421 of 478 (88%) CFR/direction pairs have exactly ONE relative orbit**
  in all real history collected so far. For these, direction alone is
  already a physically homogeneous stream identity -- there is nothing to
  combine, because there is only one relative orbit's worth of scenes.
- **57 of 478 (12%) have more than one relative orbit** within a single
  CFR/direction pairing. Inspecting the underlying scene geometry: this
  happens because a CFR's polygon straddles the boundary between two
  adjacent satellite swaths, so a SINGLE month's acquisition window
  legitimately contains scenes from two different relative orbits
  covering different parts of the same CFR -- not one relative orbit
  replacing another over time.
- **Zero month-to-month relative-orbit changes were observed** for any
  CFR/direction pair with data in more than one month. A CFR that saw
  relative orbit 28 in one month has, so far, seen relative orbit 28
  again in every other month it has data for. This is consistent with
  Sentinel-1's fixed repeat-orbit geometry and is expected to remain true
  barring a rare mission-level relative-orbit reassignment.
- Ascending relative orbits observed nationally so far: 28, 29, 101, 102,
  130, 131, 174. Descending: 50, 123. (Ascending dominates the current
  counts because the backfill processes ascending before descending
  within each month -- not because descending coverage is actually
  sparser; re-run once descending catches up.)

## Selected policy: v1

**Direction (ascending/descending) remains the job/series identity.**
Splitting by relative orbit as well would fragment 88% of CFRs into a
single-member stream for no benefit (there is only one relative orbit to
split from), while only helping the 12% that actually have more than one.
Re-splitting the entire cohort's job/series identity to serve a minority
case is the "hidden complexity for no real gain" this audit was meant to
avoid.

**Instead, per-job relative-orbit composition is recorded and exposed as
an explicit QA signal, never silently absorbed:**

- Every acquisition's `relative_orbit` and `orbit_pass` are already
  persisted verbatim per real scene (`evidence.eo_source_item.properties`,
  captured at discovery time by `ee_provider.py`) -- this audit is
  read-only against data that already exists; no new discovery/extraction
  logic is required to obtain it.
- A CFR/direction/month whose contributing scenes span more than one
  relative orbit is a genuine **common-support fragmentation** case, not
  a "mixed" scientific signal to interpret directly: the job's aggregate
  statistics blend two different incidence geometries. This is flagged,
  not hidden -- see "what changes next" below.
- This is closest to **Policy B** (combine only after the compatibility
  of what is being combined is checked), scoped tightly: for the 88%
  case, compatibility is trivially satisfied (single relative orbit,
  nothing to combine); for the 12% case, the fragmentation is named
  rather than silently averaged away.

## What this does NOT do yet

- Does not re-key `processing.eo_job`/`observations.eo_series` by relative
  orbit. That would be Policy A, and the data does not yet justify its
  cost for 88% of the cohort.
- Does not compute a quantitative VV/VH level-shift-vs-relative-orbit
  correlation yet -- there is not yet enough real multi-month, multi-
  relative-orbit history per CFR to estimate that reliably (most affected
  CFRs currently have only one real month of data). This is exactly the
  kind of premature statistical claim this programme has repeatedly
  guarded against; revisit once more months land.
- Does not yet add a `mixed_relative_orbit` flag to the observation record
  itself -- the audit script above is the diagnostic; wiring its finding
  into the persisted `eo_observation`/change-candidate layer as a
  first-class QA field is the next concrete step, tracked as follow-up
  work rather than done here.

## Re-running this audit

```
uv run python backend/scripts/analyze_s1_relative_orbit.py
```

Read-only; safe to run at any time, including while the national S1
backfill is active.
