# Cross-site multi-sensor pull summary (all 10 pilot sites)

Live Earth Engine pull, 2026-09-08, `ee-oyugijason`. Raw values:
`outputs/eo/pilot_multisensor_pull_2026-09.json`. Kisolanza's initial pull and
full methodology notes: `outputs/eo/tz-kisolanza/findings.md` (applies
identically here -- Tanzania sites use a 300m point buffer, Uganda sites use
real canonical polygons; GEDI is pooled across full mission history, not
date-matched to the Jun-Aug 2026 S2/S1 window). All figures below are DIRECT
SENSOR OBSERVATION or DERIVED EO FEATURE only -- no biological inference.

| Site | Kind | S2 NDVI | S1 asc/desc | S1 VV (dB, asc) | GEDI cover mean | GEDI AGBD mean (Mg/ha) | Elev (m) | Slope (deg) |
|---|---|---|---|---|---|---|---|---|
| tz-kisolanza | point | 0.454 | 8/8 | -12.10 | -- (n/a, see prior note) | -- | 1,720 | 3.08 |
| tz-uchindile | point | 0.200 | 16/8 | -11.82 | 0.470 | 183.0 | 1,238 | 17.10 |
| tz-tanwat | point | 0.649 | 16/24 | -11.97 | 0.450 | 71.9 | 1,827 | 7.01 |
| tz-saohill | point | 0.714 | 8/8 | -11.55 | 0.447 | 121.5 | 1,878 | 2.94 |
| tz-tabora | point | 0.252 | 7/8 | -6.96 | 0.172 | 14.7 | 1,200 | 2.33 |
| ug-zulia | polygon | 0.392 | 17/8 | -11.06 | 0.167 | 24.6 | 1,260 | 10.23 |
| ug-musamya | polygon | 0.700 | 11/18 | -10.02 | 0.319 | 59.1 | 1,201 | 4.34 |
| ug-epor | polygon | 0.631 | 8/26 | -9.97 | 0.074 | 13.3 | 1,049 | 2.89 |
| ug-bunjazi | polygon | 0.819 | 16/26 | -8.39 | 0.174 | 22.5 | 1,175 | 6.52 |
| ug-kihihi | polygon | 0.541 | 30/14 | (14 asc) -10.31 | 0.245 | 90.3 | 1,157 | 3.18 |

## Real patterns worth flagging (observation, not explanation)

- **The ascending/descending confound found at Kisolanza is universal, not
  site-specific.** Every one of the 10 sites has a real, non-trivial split
  between ascending and descending Sentinel-1 acquisitions in this one
  three-month window (ratios range from roughly 1:1 at Kisolanza/Saohill/Tabora
  to 3:1 at Epor). Any national Sentinel-1 time series (Track A2) must
  partition by orbit direction from the start -- this is not a rare edge
  case to special-case later.
- **tz-tabora is the clear outlier across every independent sensor**: lowest
  S2 NDVI (0.25) alongside the lowest GEDI cover (0.17) and lowest AGBD (14.7
  Mg/ha) of any site, and by far the least negative S1 VV (-6.96 dB, ~5 dB
  higher than every other site). Four independent measurement types agreeing
  on "this site is different" is a meaningfully stronger signal than any one
  of them alone -- but the cause (climate, land cover, moisture at
  acquisition time, or something else) has not been investigated here and is
  not asserted.
- **ug-epor: GEDI cover (0.074) looks low relative to its S2 NDVI (0.631).**
  NDVI and GEDI canopy cover measure different physical things (general
  photosynthetically-active greenness vs. lidar-detected woody canopy
  structure), so this is flagged as an open cross-sensor question, not
  reconciled here -- it could reflect genuine non-forest vegetation
  contributing to NDVI, a GEDI footprint-placement/sparsity artifact (only
  315 of Epor's 374 RH98 footprints had a cover value), a real land-cover
  mix within the polygon, or something else.
- **GEDI footprint density scales enormously with true polygon area, as
  expected**: Zulia (92,559 ha) has 136,779 RH98 footprints; Epor (223 ha)
  has 374; Bunjazi (80 ha) has 153. This is an artifact of AOI size, not a
  vegetation signal, and must be normalized (e.g. footprints per hectare)
  before any cross-site comparison of footprint counts is meaningful.

## What this does NOT show

No field-measurement comparison was performed for the Uganda sites (none
exists). For the Tanzania sites, no per-footprint date-matching against real
field campaign dates was done in this pass (see Kisolanza findings for why
that matters before any real comparison). This table is a first real look at
relative magnitude and cross-sensor consistency across a deliberately diverse
10-site sample, not a validated scientific result.
