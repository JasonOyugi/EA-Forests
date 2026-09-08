# EO source access requirements

Date verified: 2026-09-08. Source of truth for machine-readable detail:
`config/eo/sensors.yaml`. This table is the human-readable summary; if the
two ever disagree, `sensors.yaml` is authoritative for automation and this
file should be corrected to match, not the other way around.

No credentials are committed anywhere in this repository. Where "environment
variable" is listed, the variable name is the contract; its value is never
checked in (same convention as the existing `CANONICAL_API_TOKEN`,
`EARTH_ENGINE_PROJECT`).

| Source | Product(s) | Provider/catalogue | Registration | Env var(s) | Free/open | Licence/commercial notes | EA Forests status |
|---|---|---|---|---|---|---|---|
| Sentinel-2 | S2_SR_HARMONIZED | Google Earth Engine | Already have (`ee-oyugijason`) | `EARTH_ENGINE_PROJECT` | Yes | Copernicus open | **Operational** |
| Sentinel-1 | S1_GRD | Google Earth Engine | Already have | `EARTH_ENGINE_PROJECT` | Yes | Copernicus open | Adapter-ready, unimplemented |
| Sentinel-1 | S1_SLC (coherence) | Copernicus Data Space Ecosystem, or ASF | New (free CDSE account) | none yet | Yes | Copernicus open | Adapter-only external |
| Landsat 8/9 | C2 L2 SR | Google Earth Engine | Already have | `EARTH_ENGINE_PROJECT` | Yes | USGS open | Adapter-ready, unimplemented |
| HLS | L30 / S30 v002 | Google Earth Engine | Already have | `EARTH_ENGINE_PROJECT` | Yes | NASA/ESA open | Adapter-ready, unimplemented |
| ALOS PALSAR | Yearly mosaic + FNF | Google Earth Engine | Already have | `EARTH_ENGINE_PROJECT` | Yes | JAXA open | Adapter-ready, unimplemented |
| ALOS-2 PALSAR-2 | ScanSAR L2.2 | Google Earth Engine | Already have | `EARTH_ENGINE_PROJECT` | Yes | JAXA public-release program | Adapter-ready, unimplemented |
| ALOS/ALOS-2/JERS-1 (alt. mirror) | Same JAXA products, Africa-focused | Digital Earth Africa (AWS S3 `af-south-1`, STAC v1.0.0) | **None** -- no AWS account required | none | Yes | JAXA open | Documented alternative; EE path preferred (already authenticated) |
| NISAR | GCOV / GSLC | NASA Earthdata / ASF DAAC | New (free Earthdata Login) | none yet | Yes (provisional products) | NASA/ISRO open | **Monitoring release** -- provisional L-band data began 2026-06-17; our specific AOI/date coverage not yet confirmed |
| SAOCOM | L1B/L2 | CONAE catalogue, or ESA/CONAE PUMAS AO | New (CONAE user registry, or AO application) | none yet | Restricted | Commercial-use terms not established -- confirm with CONAE/ESA before any commercial application | **Blocked pending access** -- do not let this block the programme |
| GEDI | L2A / L2B / L4A | Google Earth Engine | Already have | `EARTH_ENGINE_PROJECT` | Yes | NASA/ORNL DAAC open | Adapter-ready, unimplemented |
| GEDI | L1B (raw waveform) | NASA LP DAAC | New (free Earthdata Login) | none yet | Yes | NASA open | Adapter-only external |
| GEDI | L4C (structural complexity) | NASA ORNL DAAC | New (free Earthdata Login) | none yet | Yes | NASA open | Adapter-only external |
| ICESat-2 | ATL08 v7 | NASA NSIDC DAAC | New (free Earthdata Login) | none yet | Yes | NASA open | Adapter-only external |
| ESA Biomass | L1 (now) / L2 (phased 2026-2027) | ESA Earth Online / EOGateway | New (free ESA EO sign-in) | none yet | Yes (post-commissioning) | ESA open | **Monitoring release** -- L2 (biomass/height/disturbance) still phasing in; do not assume our AOI is covered yet |
| NASADEM / SRTM | DEM | Google Earth Engine | Already have | `EARTH_ENGINE_PROJECT` | Yes | NASA/USGS open | Adapter-ready, unimplemented |

## Reading this table

- **Operational**: implemented and running in production today (Sentinel-2
  only).
- **Adapter-ready**: verified live (2026-09-08, direct `ee.ImageCollection`
  query against `ee-oyugijason`, filtered to a Uganda point, non-empty
  result) reachable through the credentials we already hold. No manual
  action required to start implementation.
- **Adapter-only external**: a real, usable product exists, but reaching it
  requires a NEW access path we have not built (a different API, a different
  free account). Documented as a boundary; implementation is a separate,
  explicit decision.
- **Monitoring release**: the mission is real and partially operational, but
  the specific product/coverage we would need is still being phased in by
  the provider (NISAR's provisional-data release only began 2026-06-17; ESA
  Biomass Level-2 is rolling out through 2027). Revisit periodically rather
  than build against it now.
- **Blocked pending access**: registration/approval we do not currently hold
  and whose current availability window is unconfirmed (SAOCOM). Per
  instruction, this must not block the rest of the programme -- proceed with
  NISAR/ALOS-2 first for L-band.

## What this means for near-term sequencing

Everything needed for the "smallest real multi-sensor experiment" (Sentinel-2,
Sentinel-1 GRD, GEDI L2A/L2B/L4A, ALOS PALSAR/PALSAR-2, NASADEM) is already
reachable through the existing `ee-oyugijason` Earth Engine connection --
**zero new credentials required** to start. Historical optical extension
(Landsat/HLS) is the same. Only the newest/most specialized structural
sources (NISAR beyond provisional, SAOCOM, ESA Biomass Level-2, ICESat-2,
GEDI L1B/L4C) need a new access decision, and none of them block starting.
