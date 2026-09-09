# Pilot geometry confidence audit

Date: 2026-09-09. Covers the 10 sites in `outputs/eo/pilot_site_manifest.json`
plus the newly-investigated "large commercial forests" (NFC/BFC and peers)
candidates. Confidence is assigned from coordinate/source provenance only,
never from how forest-like the satellite imagery looks (explicit
instruction) -- the multi-sensor pull already run at every site was NOT used
as an input to these ratings.

## Method

For the 10 original sites: traced each coordinate to its exact source file
and read any accompanying metadata literally. For "recently ingested" data:
queried the live canonical databases directly (`ea_forests_import`, the most
recently populated one, `core.entity` rows created 2026-09-05 21:45-21:48)
and read the underlying source JSON the ingestion pulled from, rather than
trusting entity/field naming alone.

## A. The 10 original pilot sites

| Site | Coordinate source | Precision stated | Point or polygon | What the point represents | Confidence |
|---|---|---|---|---|---|
| tz-kisolanza | `trial-site-registry.json` | Not stated | Point | Trial site location (unclear if plot centroid, office, or nominal site marker) | MEDIUM_CONFIDENCE |
| tz-uchindile | same | Not stated | Point | Same ambiguity | MEDIUM_CONFIDENCE |
| tz-tanwat | same | Not stated | Point | Same ambiguity | MEDIUM_CONFIDENCE |
| tz-saohill | same | Not stated | Point | Same ambiguity | MEDIUM_CONFIDENCE |
| tz-tabora | same | Not stated | Point | Same ambiguity | MEDIUM_CONFIDENCE |
| ug-zulia | `geo.aoi_version` / `geometry_observation` | `method='digitised'`, `precision_description` present (repository-derived) | **Polygon** | Full CFR boundary | HIGH_CONFIDENCE (geometry only -- see caveat) |
| ug-musamya | same | same | Polygon | Full CFR boundary | HIGH_CONFIDENCE (geometry only) |
| ug-epor | same | same | Polygon | Full CFR boundary | HIGH_CONFIDENCE (geometry only) |
| ug-bunjazi | same | same | Polygon | Full CFR boundary | HIGH_CONFIDENCE (geometry only) |
| ug-kihihi | same | same | Polygon | Full CFR boundary | HIGH_CONFIDENCE (geometry only) |

**Reasoning:**

- **Tanzania sites (MEDIUM, not HIGH or LOW):** the registry gives a plausible,
  real-looking coordinate (not a country/region centroid -- each is
  distinct, and lies in terrain consistent with the named location on a map)
  and it is traceable to real per-site Excel measurement exports, which is
  genuine provenance. But the registry itself never states what the point
  IS (trial block centroid? site office? town marker?), states no precision,
  and every trial site plausibly spans multiple blocks/ages/genera across
  real area -- almost certainly more than one pixel. Not LOW_CONFIDENCE
  because the coordinates are specific and traceable to real field records,
  not fabricated; not HIGH_CONFIDENCE because "what exactly does this point
  represent, and at what precision" is genuinely unresolved. **UNRESOLVED
  would also be defensible** for these five -- MEDIUM is used here because
  there IS a resolvable path (locate the original Excel workbooks'
  plot-level coordinates, if any exist) rather than a dead end.
- **Uganda CFRs (HIGH_CONFIDENCE for geometry, with an explicit caveat):**
  these are real digitised polygons with recorded provenance metadata in the
  canonical schema, not placeholders -- this is a categorically stronger
  spatial support than any point coordinate. **The caveat, unchanged from
  every prior EO report in this programme:** the CFR boundary's own
  provenance is `geometry_method_repository_derived` /
  `UNVERIFIED_REPOSITORY_DERIVED` -- geometrically solid enough to define a
  real polygon for EO extraction, but not a surveyed/authoritative boundary
  either. HIGH_CONFIDENCE here means "trustworthy AS a polygon support for
  EO," not "field-verified forest boundary."

**Duplicate/mismatched names:** none found among the 10 sites themselves.
(See section C below for a genuine cross-dataset name collision: "NFC" means
two different things in two different datasets in this repository.)

## B. Newly-ingested "large commercial forests" candidates (NFC/BFC, etc.)

Investigated directly in `ea_forests_import` (the canonical database this
was ingested into) rather than assumed from entity/source naming.

**What exists:** 13 `entity_type='estate'` records under
`source_dataset='large-commercial-forests'`: Ambiance Tree Farm Gomba,
**Busoga Forestry Company (BFC)**, Core Woods Ltd, Critical Mass Group (U)
Ltd - Sugar Plantation, Kijani Forestry, Modern Laminates, **NFC Achwa
Plantation**, **NFC Luwunga Plantation**, **NFC Namwasa Plantation**, Nile
Fibreboards, Nile Fibreboards Kikonda Plantation, Nile Plywoods (U) Ltd,
Woodland Investments. Each has exactly one `geometry_observation` row.

**Geometry:** every single one is `method='reported_coordinate'`,
`precision_description='Unknown source precision'`, and the row's own
metadata literally says: *"Source JSON supplies a point, not the original
polygon; numeric precision is unknown."* This is the ingestion pipeline
being honest about its own limitation -- a real polygon likely exists
somewhere for these well-known operators, but it was not captured here.

**Attribute data (species/age/area/volume/harvest status):** traced to the
source file, `vite-version/src/app/shop/data/market-databases/large-commercial-forests.json`
(committed long ago, in an early foundational commit -- not itself new).
Read directly: **5 of 13 entries (including BFC and 3 of the NFC
plantations) carry the literal comment field
`"Dummy functional test data for regional LCF analytics; replace with
verified commercial forest database values."`** The remaining 8 (including
NFC Achwa) have every forestry attribute field present but **empty**
(`area_ha: "", standing_volume_m3: "", age_classes: {}`, etc. -- an
unpopulated template, not real data). **None of the 13 records contain a
single real measured forestry attribute.** `inventory_group` entities
(e.g. "Busoga Forestry Company (BFC) euc reported inventory") are derived
from this exact same dummy source, not independent evidence.

**Recency, precisely stated:** the CANONICAL INGESTION of these rows into
`ea_forests_import` is genuinely recent (`core.entity.created_at` all fall
within a 3-minute window on 2026-09-05, four days before this audit). The
UNDERLYING SOURCE CONTENT is not recent at all -- the dummy JSON file long
predates this ingestion run. Recency of ingestion is not evidence of data
quality; this is exactly the distinction section 4 asked to be checked, and
it resolves in favor of caution: **newer canonical presence, unchanged
(dummy) content.**

**Confidence: LOW_CONFIDENCE for all 13 estates**, for both geometry
(unknown-precision reported point, explicitly not the real boundary) and
attributes (self-labeled dummy or empty). This does **not** mean the
companies aren't real -- Busoga Forestry Company and New Forests Company
("NFC") are genuine, well-known Uganda commercial forestry operators, and
the coordinates are plausible (they fall in the right general regions of
Uganda, not at a country centroid). It means **nothing in this repository
yet constitutes verified spatial or field evidence for them** -- the
`sources.json` registry entry for `UG-NFA-CFR` explicitly notes "pending
acquisition until an actual downloadable polygon artifact is resolved,"
which is the honest state of Uganda commercial-forest polygon evidence
generally, including for these named estates specifically.

**Genetic material:** a separate, non-georeferenced 259-row
`genetic_material` catalog exists (`source_dataset='nurseries'`, e.g. "UTGA
Nursery: Eucalyptus grandis Standard/Improved seed"). This is real nursery
seed/clone catalog content, but it is not tied to any specific estate's
geometry or stand -- it cannot substitute for site-specific field
measurements at NFC/BFC.

## C. NFC terminology -- resolved explicitly (section 5)

**These are two unrelated "NFC"s and must never be conflated:**

1. **Tanzania trial-site "NFC"** (`vite-version/public/data/trial-sites/`):
   a tree-breeding trial site whose `available_measurement_ages_months` list
   is corrupted (spans ~1,949 consecutive months) -- a **field-data quality**
   problem, flagged and excluded from the original pilot manifest. Its
   coordinate/genus-group data were NOT found to be suspect, only its age
   list.
2. **Uganda "NFC" commercial estates** (New Forests Company: NFC Achwa/
   Luwunga/Namwasa Plantations, `large-commercial-forests` source): a
   **geometry-precision and attribute-completeness** problem (unknown-
   precision point, dummy/empty attributes), unrelated to the Tanzania
   trial-site issue above. Nothing about these entries resembles the
   Tanzania NFC's specific anomaly.

Both are LOW/MEDIUM confidence for genuinely different reasons. Treating
them as "the same NFC problem" would be wrong on both counts.

## Summary

| Confidence | Sites |
|---|---|
| HIGH_CONFIDENCE (geometry only, not field truth) | ug-zulia, ug-musamya, ug-epor, ug-bunjazi, ug-kihihi |
| MEDIUM_CONFIDENCE | tz-kisolanza, tz-uchindile, tz-tanwat, tz-saohill, tz-tabora |
| LOW_CONFIDENCE | all 13 `large-commercial-forests` estates (BFC, 3x NFC plantations, and 9 others) |
| UNRESOLVED | none currently -- every candidate above has enough provenance to assign a rated confidence, even if that rating is low |

**No site in this repository currently combines HIGH_CONFIDENCE geometry
with real field measurements.** This was already stated in the original
pilot manifest's "explicit gaps" section and remains true after this audit;
the newly-ingested commercial-forest data does not change it.
