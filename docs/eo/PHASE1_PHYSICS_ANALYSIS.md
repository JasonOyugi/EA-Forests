# Phase 1 physics analysis (confidence-aware)

Date: 2026-09-09. Reclassifies every finding from
`outputs/eo/pilot_multisensor_pull_2026-09.json` and
`outputs/eo/tz-kisolanza/findings.md` against
`docs/eo/PILOT_GEOMETRY_AUDIT.md`. **No prior finding is deleted or
overwritten** -- this document annotates confidence/status; the raw pull
data and original findings remain as they were.

Interpretation classes used below: `OBSERVED_SENSOR_BEHAVIOUR`,
`DERIVED_EO_RELATIONSHIP`, `FIELD_ALIGNED_EVIDENCE`,
`TENTATIVE_BIOLOGICAL_INTERPRETATION`, `UNRESOLVED`.

---

## Finding 1: Ascending/descending Sentinel-1 divergence is universal

- **Sensor(s):** Sentinel-1 GRD.
- **Site(s):** all 10 pilot sites (both Uganda HIGH_CONFIDENCE polygons and
  Tanzania MEDIUM_CONFIDENCE points).
- **Spatial confidence:** irrelevant to this finding -- it holds regardless
  of site geometry confidence, which is exactly why it survives the
  reclassification untouched.
- **Temporal confidence:** high (single well-defined Jun-Aug 2026 window,
  same window for every site).
- **Evidence type:** real scene counts per orbit pass, directly from EE
  metadata (`orbitProperties_pass`), not modeled.
- **Likely confounders:** none identified that would produce this as an
  artifact -- orbit geometry is a hard instrument fact, not a derived
  quantity.
- **Interpretation status: `OBSERVED_SENSOR_BEHAVIOUR`.** This is the
  strongest-confidence finding in the whole pilot: it is orbit metadata, not
  a derived feature, and does not depend on which site coordinate turns out
  to be correct. **Unchanged by the geometry audit.**

## Finding 2: Sentinel-1 provider recipe correctly separates orbit streams

- **Sensor(s):** Sentinel-1 GRD, via the new
  `s1-grd-backscatter-{ascending,descending}-v1` recipes.
- **Site(s):** ug-epor (live end-to-end verification).
- **Spatial confidence:** HIGH_CONFIDENCE (real CFR polygon).
- **Temporal confidence:** high (same window both recipes).
- **Evidence type:** direct sensor observation (VV/VH dB means) through the
  actual provider code path, not the ad hoc script.
- **Likely confounders:** none for the software-correctness claim itself.
- **Interpretation status: `OBSERVED_SENSOR_BEHAVIOUR`.** Ascending
  (8/34 eligible, VV -9.85dB) and descending (26/34 eligible, VV -8.72dB)
  produced genuinely different results through the real recipe dispatch,
  proving no blending occurs. This is an engineering finding about the
  pipeline, not a claim about Epor's forest state.

## Finding 3: Tabora is a multi-sensor outlier (lowest NDVI/cover/AGBD, highest VV)

- **Sensor(s):** Sentinel-2, Sentinel-1, GEDI L2B/L4A.
- **Site(s):** tz-tabora.
- **Spatial confidence: MEDIUM_CONFIDENCE** (per the geometry audit -- a
  real, traceable point of unstated precision and unknown represented
  extent).
- **Temporal confidence: LOW.** GEDI values were pooled across the full
  2019-2025 mission history (not date-matched to the Jun-Aug 2026 S2/S1
  window); S2/S1 themselves share a window but were never checked against
  the field campaign dates.
- **Evidence type:** derived EO features (NDVI, VV mean, GEDI cover/AGBD
  means), not raw observation, and not compared to any field measurement.
- **Likely confounders, NOT yet checked (per instruction, asked explicitly
  before any biological reading):**
  - Is the coordinate/geometry actually correct for the Tabora trial site,
    or does the 300m buffer partly miss it? **Not verified.**
  - Are the S2/S1/GEDI footprints observing the same spatial support?
    **Not verified** -- GEDI's ~25m footprints and the 300m optical/SAR
    buffer are not the same support by construction, and footprint-to-buffer
    overlap fraction was not computed.
  - Are acquisition dates compatible with each other or with any field
    measurement? **No** -- GEDI is pooled across 6+ years; S2/S1 are one
    2026 season only.
  - Is terrain relevant? Slope at Tabora (2.33 deg) is the second-gentlest
    of all 10 sites -- terrain is an unlikely confounder here specifically.
  - Is rainfall/moisture relevant? **Not checked** -- no rainfall/soil-
    moisture context was pulled in this pass.
  - Are GEDI footprints interior to the intended stand? **Not checked** --
    no per-footprint overlap-fraction or edge-distance calculation was done.
- **Interpretation status: downgraded from any implied biological reading
  to `UNRESOLVED`.** Four independent sensors agreeing on "this location
  reads differently" remains a real, reportable pattern -- but per
  instruction, it is not explained biologically until spatial support,
  temporal alignment, and confounders above are actually checked, and the
  underlying MEDIUM_CONFIDENCE geometry means even the site identity itself
  is not fully pinned down. Tabora's real-world climate (west-central
  Tanzania, drier/miombo-adjacent) remains a plausible, NOT confirmed,
  candidate explanation -- stated as a hypothesis, not a finding.

## Finding 4: Epor's low GEDI cover relative to its NDVI

- **Sensor(s):** Sentinel-2, GEDI L2B.
- **Site(s):** ug-epor.
- **Spatial confidence: HIGH_CONFIDENCE** (real canonical CFR polygon --
  this is the one finding in this document where the site geometry itself
  is NOT the open question).
- **Temporal confidence: LOW**, same GEDI-pooling caveat as Finding 3 (GEDI
  full mission history vs. one 2026 S2 season).
- **Evidence type:** derived EO features from two different sensors, no
  field data exists for any Uganda CFR to check against.
- **Likely confounders, still not checked:**
  - GEDI footprint-to-polygon overlap: Epor's 374 RH98 footprints only had
    315 with a paired cover value -- some footprint attrition is already
    visible; how many of the 315 fall well inside the CFR polygon versus
    near its edge (where "edge distance"/interior-mask concerns raised in
    the task apply) has not been computed.
  - Optical season: NDVI reflects general photosynthetically-active
    greenness (which can include non-woody/non-forest vegetation); GEDI
    cover specifically measures lidar-detected woody canopy structure --
    genuinely different physical quantities, not necessarily expected to
    agree even under perfect data.
  - Acquisition-date spread within the pooled GEDI sample (2019-2025) versus
    the single 2026 NDVI season.
- **Interpretation status: `UNRESOLVED`, explicitly not forced into
  agreement.** This remains the correct label after the audit -- it was
  already reported as unresolved in the original pull summary, and nothing
  in the geometry audit changes that (Epor's geometry confidence is HIGH,
  unlike Tabora's).

## Finding 5: Kisolanza's GEDI RH98 magnitude is broadly plausible against field height

- **Sensor(s):** GEDI L2A, field measurements (`trial-entry-performance-summary.json`).
- **Site(s):** tz-kisolanza.
- **Spatial confidence: MEDIUM_CONFIDENCE** (per audit -- downgraded from
  how the original findings.md implicitly treated it).
- **Temporal confidence: LOW** (GEDI pooled 2019-2025; field measurements at
  specific campaign ages 17-91 months, no explicit `delta_t` computed
  between any single GEDI shot and any single field campaign).
- **Evidence type:** the original findings.md was already careful to call
  this "a magnitude check only, not confirmation" -- reclassified here as
  `TENTATIVE_BIOLOGICAL_INTERPRETATION` at best, and only that high because
  it never claimed more than order-of-magnitude plausibility to begin with.
- **Interpretation status: `TENTATIVE_BIOLOGICAL_INTERPRETATION` (was
  already appropriately hedged; now also flagged for the site's
  MEDIUM_CONFIDENCE geometry).** Before this can become
  `FIELD_ALIGNED_EVIDENCE`, it needs: (1) the site point's precision/meaning
  resolved, (2) real footprint-to-block overlap (blocks don't yet have
  polygons), (3) per-shot `delta_t` against the nearest real campaign date.

## Cross-cutting: what would move UNRESOLVED findings forward

Every downgraded/unresolved finding above shares the same missing
prerequisites: (1) resolved spatial support (a real plot/estate polygon, or
at minimum a stated point-precision/extent), (2) per-observation temporal
matching (`delta_t`) instead of pooling years of data, (3) footprint/pixel
overlap-fraction calculation against whatever polygon eventually exists. No
finding in this pilot has all three yet -- which is why
`calibration_pilots` in `outputs/eo/pilot_site_manifest_v2.json` is
currently empty. This is the expected, honest state after this audit, not a
gap to paper over.
