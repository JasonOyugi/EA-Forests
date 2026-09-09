# NFC/BFC: Tier-2 context addendum (not a calibration workstream)

Date: 2026-09-09. Per explicit correction: NFC/BFC are **Tier 2 (EO
interpretation context)**, not a dedicated major calibration workstream.
This is a short, deliberately bounded addendum -- it does not replace or
duplicate the fuller `docs/eo/NFC_BFC_CALIBRATION_PLAN.md` and
`outputs/eo/calibration_targets/nfc_bfc_manifest.json` already produced on
`feature/eo-calibration-multisensor-v0-1`, which remain the calibration-
target-identity reference.

## Real, sourced Tier-2 evidence found (not previously surfaced)

`vite-version/src/app/shop/data/market-databases/processors.json`
("Busoga Forestry Company Limited") is a **different, better-evidenced**
record than the dummy `large-commercial-forests.json` estate entries: it
cites a real government registry (Uganda ERA registered wooden-pole
suppliers list, `https://www.era.go.ug/registered-wooden-poles-suppliers/`,
"accessed 2026-07-22") and explicitly self-rates its own coordinate
confidence ("Medium") and audits its own precision ("exact gate not
independently verified") rather than asserting false certainty. It states:
**BFC's plantations are publicly associated with the Bukaleba and Kachung
Central Forest Reserves** (the coordinate given is the Masese/Jinja mill
locality, not a plantation boundary).

This is Tier 2 evidence exactly as defined: reported estate/processing
context (products, certification, operational locality), not a stand-level
geometry or field measurement. It does not change BFC's geometry confidence
rating (still no plantation-boundary evidence) and must not be treated as
such.

## A real, zero-cost linkage this enables

**Bukaleba and Kachung are themselves real, canonical, HIGH_CONFIDENCE Uganda
CFR polygons already in this repository's 656-CFR cohort, already carrying
real August 2026 Sentinel-2 observations** from the national country pass --
no new ingestion required to note this:

| CFR | Area (ha) | NDVI mean (Aug 2026) |
|---|---|---|
| Bukaleba | 9,548.5 | 0.608 |
| Kachung | 3,643.3 | 0.762 |

This does **not** mean BFC's actual plantation boundary equals either CFR
polygon (a licensed plantation concession within a gazetted CFR is
routinely a subset of the CFR's full extent, not the whole reserve) -- that
would be exactly the kind of unsupported geometry promotion this programme
has repeatedly guarded against. It means: if/when a real BFC plantation
boundary is eventually acquired (per the existing calibration plan's
evidence hierarchy), Bukaleba and Kachung are the two CFRs most likely to
geographically contain it, based on real, sourced, government-registry
context -- worth prioritizing if/when better BFC geometry becomes available,
rather than treating all 656 CFRs as equally likely candidates.

## NFC

The user's context notes NFC's known internal GIS/microforest-mapping
capability as a reason stronger geometry may eventually be obtainable. No
document evidencing that capability's actual output (a shapefile, a GIS
export, a specific dataset) was found in this repository during this pass.
This is recorded as context for a future opportunistic ingestion, not
treated as evidence that currently exists.

## What this addendum deliberately does NOT do

- Does not promote any dummy `large-commercial-forests.json` record.
- Does not create a new canonical entity, AOI, or geometry observation.
- Does not treat Bukaleba/Kachung's existing CFR-level NDVI as a
  plantation-specific measurement -- it is the WHOLE reserve's area-weighted
  mean, almost certainly including non-BFC land.
- Does not spend further implementation time on NFC/BFC beyond this note,
  per instruction.
