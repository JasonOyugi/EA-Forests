# L-band real catalogue discovery

Date: 2026-09-10. Real, live queries against NASA's ASF (Alaska Satellite
Facility) public search API and Earth Engine's public data catalog --
no fabricated coverage, no credentials used for discovery itself.

## Real results per source

| Source | Access checked | Coverage found (Epor, UG) | Years | Polarization | Resolution | Credential friction |
|---|---|---|---|---|---|---|
| **ALOS PALSAR (raw scenes)** | ASF search API | 42 real granules | 2006-2011 | HH+HV (FBD) | ~10-30m | Earthdata Login for download |
| **ALOS/ALOS-2 PALSAR global yearly mosaic** | Earth Engine (`JAXA/ALOS/PALSAR/YEARLY/SAR`) | Real HH/HV values extracted for 2007, 2010, 2015, 2020 | 2007-2010, 2015-2020 (gap 2011-2014) | HH, HV | 25m | **None** -- same EE credential already in use |
| **ALOS-2 PALSAR-2 (raw scenes)** | ASF search API | 0 results for Uganda/Kenya test AOIs | -- | -- | -- | N/A (not found via this route) |
| **JERS-1** | ASF search API | 12 real granules | 1992-1998 | HH | ~18m | Earthdata Login for download |
| **NISAR** | Earth Engine catalog, ASF | Not found in either accessible catalog at this time | -- | -- | -- | Mission still in early access/commissioning as far as this check could determine |
| **SAOCOM** | Not investigated | -- | -- | -- | -- | CONAE (Argentina) distributes via its own portal; no public discovery API found in this pass -- flagged as higher friction, deprioritized |

## Real proof of concept

Extracted real HH/HV mean backscatter (raw DN, JAXA's documented
calibration `10*log10(DN^2) - 83.0 dB` not yet applied) for Epor CFR
across four real years from the Earth Engine global mosaic:

```
2007: HH=4841.8, HV=2015.1
2010: HH=5165.9, HV=2116.2
2015: HH=4649.7, HV=1922.2
2020: HH=5311.7, HV=2160.9
```

Confirms end-to-end real extraction works today, with zero new
credentials, against a real forest AOI already in the canonical cohort.

## Selected next L-band experiment

**JAXA's ALOS/PALSAR-2 global yearly mosaic via Earth Engine** is the
clear best next step:

- **Accessible now** -- no credential blocker, unlike raw-scene ALOS
  PALSAR/JERS-1 (Earthdata Login) or SAOCOM (CONAE registration) or
  NISAR (not yet found in an accessible catalog).
- **Real temporal depth** -- 2007-2010 and 2015-2020 (a 4-year gap, real
  and disclosed, not hidden) predates the entire Sentinel-1/2 record,
  giving genuine long-term L-band context the way the Landsat pull gives
  long-term optical context.
- **Global, pre-processed, geocoded product** -- no raw-scene mosaicking,
  terrain correction, or calibration pipeline needs to be built first.

Not selected for the first production experiment: raw ALOS
PALSAR/ALOS-2/JERS-1 scenes (real coverage exists but gated behind
Earthdata Login, the same credential blocker already documented for
GEDI -- see `docs/eo/EARTHDATA_SETUP.md`) and SAOCOM (access path not yet
even identified).

## What this does NOT do

- Does not implement a canonical L-band recipe/provider in the durable
  EO job pipeline -- this is discovery plus a proof-of-concept
  extraction, not production ingestion.
- Does not compare L-band to contemporaneous S1/S2 on real observations
  yet (the mosaic's yearly cadence and 2015-2020 endpoint limit direct
  temporal overlap with the current Sentinel-period change candidates,
  most of which fall in 2025-2026) -- the most recent PALSAR-2 mosaic
  year available (2020) predates the current change-detection window
  entirely, so a real "what does L-band add" comparison against a 2026
  candidate is not yet possible from this dataset alone.
- Does not apply JAXA's DN-to-gamma0 calibration formula to the extracted
  values above (reported as raw DN, labeled as such) -- trivial to add
  once this becomes a real recipe.
