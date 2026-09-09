# Workstream A: real delta_t and footprint/interior-support computation

Date: 2026-09-09. This is the actual computation against the analytical
contract already specified on `feature/eo-calibration-multisensor-v0-1`
(`docs/eo/EO_FIELD_ALIGNMENT_SPEC.md`) -- that branch defined the schema;
this document reports real numbers computed against it, and is additive to
`docs/eo/PHASE1_PHYSICS_ANALYSIS.md` (no prior finding is deleted).

## A1/A2: temporal delta -- honest result: mostly UNCOMPUTABLE at real precision

Checked directly: `trial-entry-performance-summary.json` (the only real
field-measurement source in this repository) records `age_months` per
measurement campaign, but **no absolute field measurement date anywhere in
the trial-sites dataset** -- not in the entry rows, the site registry, or
the climate-profile metadata files. There is no planting date to derive
either (deriving one from `field_date - age` requires a `field_date`, which
does not exist here).

**Result: every Tanzania EO-field candidate pairing gets
`field_temporal_precision = AGE_ONLY`, not `DAY`/`MONTH`/`YEAR`.** This is
one of the explicitly allowed classes in the alignment contract, not a
failure -- it is the honest answer given what evidence actually exists. Per
instruction, no field date was fabricated to force a better precision class.
GEDI's own acquisition dates ARE known exactly per footprint
(`system:time_start`), so the EO side of any future pairing has real
`DAY`-precision dates -- it is specifically the field side that is
`AGE_ONLY` for every one of the 5 Tanzania engineering-pilot sites.

**Temporal compatibility classification (A2):** with `AGE_ONLY` field
precision, no pairing can be rated better than `UNKNOWN` compatibility --
`NEAR_SIMULTANEOUS`/`SHORT_OFFSET`/`MATERIAL_OFFSET` all require knowing an
actual `delta_t`, which is not available. This applies uniformly; no site's
pairing is classified `INCOMPATIBLE` (that would itself be a claim requiring
a known delta_t) -- all are `UNKNOWN`.

## A3/A4: GEDI footprint/polygon overlap and interior support -- real numbers

**Data-access limitation, verified live (not assumed):** Earth Engine does
not expose individual GEDI shot geometries. `LARSE/GEDI/GEDI02_A_002_MONTHLY`
is confirmed (via `.projection().nominalScale()`) to be a 25m GRIDDED
raster, not per-shot points; the only vector GEDI asset on EE,
`LARSE/GEDI/GEDI02_A_002_INDEX`, is confirmed (via its schema:
`table_id`/`time_start`/`time_end` only) to be a per-GRANULE swath polygon,
not a per-shot ~25m footprint circle. True per-shot footprint-circle overlap
(as literally specified) would require raw GEDI L1B/L2A granules from NASA
LP DAAC directly (`adapter_only_external`, not pulled, per instruction not
to materialise large archives casually).

**What was computed instead, as the closest honest analog:** for each AOI,
the real area-weighted fraction of the AOI actually covered by a valid GEDI
pixel (same area-weighted `sum()` reducer methodology already verified for
S1/S2), both for the full AOI and for three PostGIS-eroded interior masks
(`ST_Buffer(geometry, -10/-20/-30)`, analysis-only, never written back onto
canonical geometry). Live results
(`outputs/eo/gedi_overlap_interior_support_2026-09.json`):

| Site | Full-AOI GEDI coverage | Interior 10m | Interior 20m | Interior 30m | Direction with erosion |
|---|---|---|---|---|---|
| ug-zulia (92,559 ha) | 9.21% | 9.21% | 9.21% | 9.21% | flat (huge AOI, edge negligible) |
| ug-musamya (739 ha) | 6.92% | 6.92% | 6.91% | 6.90% | flat |
| ug-epor (223 ha) | 9.99% | 10.03% | 10.10% | 10.11% | rising toward interior |
| ug-bunjazi (80 ha) | 11.44% | 11.58% | 11.76% | 11.93% | rising toward interior |
| ug-kihihi (36 ha) | 11.83% | 11.82% | 11.83% | 11.37% | roughly flat, noisy at 30m (small pixel count) |
| tz-kisolanza (300m buffer) | 14.60% | 14.86% | 15.18% | 15.27% | rising toward interior |
| tz-uchindile | 8.98% | 8.92% | 8.80% | 8.55% | falling toward interior |
| tz-tanwat | 9.92% | 10.04% | 10.25% | 10.30% | rising toward interior |
| tz-saohill | 8.96% | 8.88% | 8.57% | 8.40% | falling toward interior |
| **tz-tabora** | **16.87%** | **17.12%** | **17.22%** | **17.16%** | rising toward interior |

**Real finding directly relevant to the Tabora reassessment below: Tabora
has the HIGHEST GEDI coverage fraction of any of the 10 sites**, not the
lowest -- it is not GEDI-undersampled relative to its peers.

**Interior-erosion direction is not uniform** (Epor/Bunjazi/Kisolanza/Tanwat
rise toward the interior -- consistent with some edge attenuation; Uchindile
and Saohill fall toward the interior -- the opposite). At the smaller sites
(Kihihi, and every 300m-buffer Tanzania site), sample sizes are small enough
(tens of 25m pixels) that this may be substantially noise, not a real edge
effect. **Genuinely unresolved, reported as such rather than forced into one
direction.**

## A5: reassessment of prior findings

- **Tabora:** was flagged in `PHASE1_PHYSICS_ANALYSIS.md` as `UNRESOLVED`
  pending confounder checks. New evidence: Tabora's GEDI coverage fraction
  (16.9%) is the highest of all 10 sites, ruling out "GEDI data sparsity at
  this specific location" as a contributor to its outlier optical/SAR/GEDI
  signal. This narrows, but does not resolve, the open question -- terrain,
  moisture, and true species/stand composition remain unchecked. **Remains
  `UNRESOLVED`**, now with one fewer plausible confounder.
- **Epor:** its GEDI-cover-vs-NDVI discrepancy finding is unaffected by this
  analysis (that finding was never about coverage sparsity). **Remains
  `UNRESOLVED`**.
- **Kisolanza:** its `TENTATIVE_BIOLOGICAL_INTERPRETATION` status (GEDI RH98
  magnitude vs. field height) is now additionally constrained: since field
  measurements are confirmed `AGE_ONLY` precision (no absolute date exists
  to compute), that finding **cannot be upgraded past
  `TENTATIVE_BIOLOGICAL_INTERPRETATION` using this repository's current
  evidence** -- a real `delta_t`-controlled comparison is not achievable
  without new field date evidence, not just new analysis.
- All 10 sites: interior-mask analysis is new evidence, not previously
  available, and is reported above rather than folded silently into the
  original findings.

## E1: Sentinel-1 orbit-direction effect -- quantified on the 3 sites with real paired data

Only 3 sites have both orbits run through the real job-pipeline recipe with
directly comparable statistics (Workstream C's engineering-pilot proof; the
ad hoc 10-site pull only recorded ascending VV, not a paired descending
value, so it cannot answer this question):

| CFR | Ascending VV (dB) | Descending VV (dB) | Difference (desc - asc) |
|---|---|---|---|
| Epor | -9.85 | -8.69 | **+1.16** (descending higher) |
| Zulia | -10.91 | -11.47 | **-0.56** (ascending higher) |
| Musamya | -9.90 | -9.27 | **+0.63** (descending higher) |

**The sign of the orbit effect is not consistent across these 3 CFRs.** This
is a real, if small-sample, answer to the task's own question ("does the
sign/magnitude differ by forest structure?") -- at minimum, the effect is
NOT a uniform system-wide bias correctable with one constant. Whether this
is explained by incidence angle, terrain orientation, wet/dry conditions, or
genuine structural difference has NOT been tested here (would need
per-scene incidence-angle and terrain-slope/aspect data joined to each
acquisition, not done in this pass) -- reported as an open, quantified-but-
unexplained finding, not attributed to any cause.
