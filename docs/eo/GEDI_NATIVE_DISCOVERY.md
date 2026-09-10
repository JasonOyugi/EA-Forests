# Native GEDI discovery (NASA CMR, not Earth Engine)

Date: 2026-09-10. `backend/scripts/discover_gedi_native.py`, output:
`outputs/eo/gedi_native_discovery.json`. Real, live NASA CMR granule
search -- no credentials required for discovery, and none were used.

## What this proves that EE screening could not

EE's `LARSE/GEDI/GEDI02_A_002_MONTHLY` is a 25m gridded raster (verified in
an earlier pass); it cannot give per-shot geometry. This script queries
NASA's Common Metadata Repository directly for the current GEDI02_A (L2A)
product's real GRANULES intersecting four real AOI bounding boxes --
confirming granule-level (not just gridded-raster) GEDI coverage actually
exists, independent of Earth Engine's representation.

## Real results

| AOI | Granules found (page-capped at 200) | Earliest | Latest |
|---|---|---|---|
| Epor (UG) | 38 | 2019-09-02 | 2025-04-11 |
| Zulia (UG) | 200+ | 2019-04-14 | 2025-06-26 |
| Musamya (UG) | 52 | 2019-05-11 | 2025-01-02 |
| Mount Kenya gazetted forest (KE) | 200+ | 2019-04-07 | 2022-08-03 |

All four real AOIs have genuine multi-year GEDI L2A granule coverage,
spanning nearly the full GEDI mission to date -- a far longer real record
than the current 12-month Sentinel history.

## Confirmed credential blocker (verified directly, not assumed)

A real `HEAD` request against a real granule download URL
(`https://data.lpdaac.earthdatacloud.nasa.gov/lp-prod-protected/...`)
returned **HTTP 403 Forbidden**, confirming LP DAAC granule download
requires a NASA Earthdata Login (URS) account. This environment has no
Earthdata credentials configured (checked: no `EARTHDATA_*`/`NASA_*`
environment variables, no `~/.netrc` entry) -- this is a genuine,
externally-imposed blocker to shot-level retrieval, not a shortcut taken
here. CMR *search* itself needed no credentials and is not blocked.

## What remains before native GEDI shot-level data can be ingested

1. Obtain a NASA Earthdata Login account and credentials (a human/ops
   action outside this session's scope -- an API key or username/password
   cannot be fabricated).
2. Implement authenticated granule download (`.netrc` or bearer-token
   flow) and HDF5 (`.h5`) parsing for GEDI02_A's shot-level arrays
   (`shot_number`, `beam`, `lon_lowestmode`, `lat_lowestmode`,
   `quality_flag`, `sensitivity`, `rh` 0-100 profile) -- not built this
   pass; scoped as the concrete next step once credentials exist.
3. Build the footprint-support kernel (`gedi-footprint-support-v1`) and
   AOI overlap computation described in the milestone brief, versioned
   separately from EE's gridded-raster coverage numbers already computed.

## What this does NOT do

- No shot-level data was retrieved or fabricated.
- No footprint geometry was constructed (that requires the real
  `lon_lowestmode`/`lat_lowestmode` fields from an actual downloaded
  granule).
- EE-gridded GEDI screening remains valid for national-scale coverage
  scanning; this native path is specifically for calibration-grade,
  per-shot evidence, per the programme's existing tier distinction.
