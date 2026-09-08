# Smallest real multi-sensor experiment: Kisolanza, Tanzania

Run: 2026-09-08, live against `ee-oyugijason`, real Earth Engine calls, no
mocked/fake provider. Site: real point from
`vite-version/public/data/trial-sites/trial-site-registry.json`
(-8.15151, 35.4027). **Spatial support: a 300m-radius buffer around the
registry point, an explicit assumption, not a surveyed plot boundary** -- no
plot polygon exists in the repository (see `docs/eo/REPOSITORY_EO_AUDIT.md`
section 3). All numbers below are real query results, not illustrative.

## What each instrument physically observed

### 1. DIRECT SENSOR OBSERVATION

- **Sentinel-2** (`COPERNICUS/S2_SR_HARMONIZED`, Jun-Aug 2026, cloud <40%):
  35 scenes.
- **Sentinel-1 GRD** (`COPERNICUS/S1_GRD`, IW, Jun-Aug 2026): 16 scenes --
  **8 ascending + 8 descending**. This is a real, present confound at this
  exact site, not a hypothetical one: an ascending-only mean VV was reported
  below specifically to avoid mixing the two geometries, per instruction.
  Bands present: VV, VH, angle (incidence).
- **GEDI L2A/L2B/L4A** (`LARSE/GEDI/...`, full mission history 2019-04-01 to
  2025-07-01, 300m buffer): 70/52/53 footprints respectively (RH98/cover/AGBD
  band counts differ slightly -- not every footprint carries every metric at
  usable quality). **No footprints existed in the narrower Jun-Aug 2026 (or
  even 2024-2026 post-hibernation) window at this small buffer** -- GEDI's
  track spacing is sparse enough that a short recent window over a 300m spot
  can genuinely show zero shots even though the mission has passed nearby
  historically. Confirmed by widening the buffer: 66 footprints at 300m,
  2,482 at 2km, 59,253 at 10km, across full history. This is a real spatial-
  support/revisit constraint, not a data gap to paper over.
- **ALOS-2 PALSAR-2 ScanSAR** (`JAXA/ALOS/PALSAR-2/Level2_2/ScanSAR`,
  unfiltered by date for this pass): 510 scenes exist for this location
  across the archive; most recent 2025-12-29. Bands: HH, HV, LIN, MSK.
- **NASADEM**: elevation 1,720m, slope 3.08 deg (gentle terrain -- consistent
  with a Southern Highlands plateau setting, not steep terrain requiring
  heavy radiometric-terrain-correction scrutiny at this specific site).

### 2. DERIVED EO FEATURE

- Sentinel-2 NDVI (median composite, Jun-Aug 2026): **mean 0.454** over the
  300m buffer.
- Sentinel-1 ascending VV (linear-to-dB as delivered by EE, mean over
  ascending scenes only): **-12.10 dB**.
- GEDI L2A RH98 (all-history pooled): mean 7.11m, range 0-28.15m (n=70).
- GEDI L2B canopy cover: mean 0.259 (26%), range 0.003-0.735 (n=52).
- GEDI L4A AGBD (model-derived, see prohibition below): mean 49.8 Mg/ha,
  range 0.5-280.5 (n=53).

The wide GEDI ranges (RH98 0-28m; AGBD 0.5-280 Mg/ha) within one 300m buffer
are physically consistent with a real multi-species, multi-age trial site
(the field registry lists eucalyptus clonal hybrid, eucalyptus pure species,
and pine blocks measured from 17 to 91 months) -- but this run pooled all
footprints across 2019-2025 without per-footprint date matching, so it is
reported as a magnitude check only, not a validated per-block estimate.

### 3. BIOLOGICAL INFERENCE

None performed in this pass. No height/AGB/DBH value above has been compared
against the real field measurements (`trial-entry-performance-summary.json`)
with proper `delta_t` (temporal separation) accounting. That comparison is
the natural next step, not done here.

### 4. UNSUPPORTED / UNTESTED HYPOTHESIS

None asserted. Specifically NOT claimed: that GEDI RH98 (mean 7.11m, mixed
vintage 2019-2025) "confirms" the field-measured mean height (e.g. 6.68m at
17 months for one specific eucalyptus entry, measured at a specific,
different date) -- these are different measurement types (waveform relative
height vs. tape-measured tree height), different footprints (unknown which
specific trial blocks the 70 GEDI shots actually fall on), and different
dates. Reporting their rough numerical similarity without controlling for
any of that would be exactly the kind of premature biological inference this
phase prohibits.

## Where sensors agree, disagree, and what remains open

- **Agreement (order of magnitude only):** GEDI's canopy-height and cover
  signals (7m mean RH98, 26% mean cover) are directionally consistent with a
  young-to-mid-rotation mixed plantation, which matches what the field
  registry describes for this site in general terms. This is not a
  validated agreement -- it is a plausibility check.
- **Real confound already surfaced:** Sentinel-1's 50/50 ascending/descending
  split at this exact site is not a hypothetical risk -- it is present in
  the very first real query. Any temporal SAR analysis at Kisolanza must
  split by orbit direction from the start.
- **Open/underdetermined:**
  - Which GEDI footprints fall on which specific trial block/genus/age is
    unknown without footprint-level geometry and overlap-fraction
    calculation (`w_j = |footprint intersect block| / |footprint|`) against
    real block boundaries -- which do not yet exist for this site.
  - Whether the November-2025-dated PALSAR-2 backscatter and the June-
    August-2026 S2/S1 window represent comparable canopy states is not
    established (no explicit `delta_t` computed in this pass).
  - No rainfall/soil-moisture context was pulled for this window -- the S1
    VV value above has not been checked against antecedent rainfall, so it
    must not yet be read as a structural signal.

## What would most reduce uncertainty next

1. Locate or digitize real trial-block boundaries at Kisolanza (the
   repository currently has only a site-level point) -- this alone would
   let every sensor pull above be properly stratified by genus/age instead
   of pooled.
2. Compute real per-footprint `delta_t` against the nearest field
   measurement campaign before any GEDI-vs-field comparison.
3. Repeat this same pull, unmodified, for the other 4 selected Tanzania
   sites and the 5 Uganda CFRs to see whether the ascending/descending
   split, GEDI sparsity, and PALSAR-2 cadence patterns found here generalize
   or are site-specific.

This is a first real look, not a calibrated result. No production feature,
score, or inference should be built from these numbers yet.
