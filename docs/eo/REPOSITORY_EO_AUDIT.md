# Repository EO audit (multi-sensor physics observatory, Phase 1)

Date: 2026-09-08. Branch `feature/uganda-cfr-s2-history`, building on HEAD
`ebdfcbe`. This audit is scoped to what changed/matters for the multi-sensor
expansion; it does not repeat the full canonical-state audit in
`docs/architecture/eo-observation-architecture.md`, which remains the
authoritative record of the base evidence/observation model.

## 1. What already exists (do not rebuild)

- **656 canonical Uganda CFR AOIs** (`geo.aoi`/`geo.aoi_version`), immutable,
  versioned, `analysis_scope="uganda_cfr_commercial_eo_mvp"`.
- **One real Earth Engine provider** (`backend/app/services/eo/ee_provider.py`),
  behind a provider-neutral `EOProvider` protocol
  (`backend/app/services/eo/provider.py`) that already separates discovery,
  extraction, and DTOs from any specific sensor's execution objects.
- **A complete Sentinel-2 recipe** (`s2-sr-optical-v1`, QA
  `s2-qa-scl-core/1`, statistics `moments-v1`) with immutable
  `observations.eo_series`/`eo_observation`/`eo_feature_set`/`eo_feature_value`
  storage, a fixed 20m analysis grid (`backend/app/services/eo/grid.py`),
  durable PostgreSQL job leasing/fencing/retry (`backend/app/services/eo/worker.py`,
  hardened further this phase in `backend/app/services/eo/reliability.py`),
  and one complete August 2026 national pass (656/656 success).
- **A local canonical browser/backend auth bridge** and a right-side EO
  evidence drawer in the dashboard map.

None of this is touched by the multi-sensor work below. New sensors extend
the same `EOProvider` protocol and the same observation/series tables
(`provider_key`/`collection_key` already exist as first-class columns on
`observations.eo_series` and `evidence.eo_source_item` specifically so a
second provider does not require new tables).

## 2. What is genuinely new since the last EO pass

- `config/eo/sensors.yaml` -- a config-driven sensor/product registry (18
  products across S2, S1, Landsat, HLS, ALOS/ALOS-2, JERS-1, NISAR, SAOCOM,
  GEDI (L1B/L2A/L2B/L4A/L4C), ICESat-2 ATL08, ESA Biomass, and two DEMs), each
  entry recording native support, bands/polarizations, access method, and a
  `verified: {method, date}` field -- no entry asserts availability without
  saying how and when it was checked.
- `docs/eo/ACCESS_REQUIREMENTS.md` -- per-source credential/registration/licence
  status.
- This audit and `outputs/eo/pilot_site_manifest.json`.

## 3. Real field-evidence discovery (the most consequential finding)

The repository already contains **real, field-measurement-backed forestry
trial data for 13 Tanzanian sites**, at
`vite-version/public/data/trial-sites/`:

- `trial-site-registry.json` -- one lat/lon **point** per site (Kisolanza,
  Korogwe, KVTC, NFC, North Ruvu, Saohill, SFI Handeni, Tabora, Tanwat,
  Tukuyu, Uchindile, Unilever, Wino), each tagged with the genus groups trialed
  (eucalyptus pure species, eucalyptus clonal hybrids, corymbia, pine) and the
  measurement campaign ages available.
- `trial-entry-performance-summary.json` -- 6,128 real per-(site, genus
  group, age, entry) rows with `n_planted`, `n_alive`, `survival_rate`,
  `mean_height_m`/`sd_height_m`, `mean_dbh_cm`/`sd_dbh_cm` (frequently `null`
  at young ages -- DBH is genuinely not always measured, and the data honestly
  says so via `n_dbh: 0` rather than a fabricated zero), `mean_stem_score`,
  and an explicit `data_quality_flag` (e.g. `"missing_dbh|missing_volume|not_latest"`).
  Every row traces to `source_files` naming a real per-site-per-age Excel
  workbook (e.g. `"KISOLANZA/(17 months) - Kisolanza.xlsx"`).

**This is real evidence, not synthetic data.** It is clearly distinguishable
from the dashboard's investor-facing demo data
(`vite-version/src/app/dashboard/data/forestry-data.ts`), which is confirmed
synthetic: `seededUnit()` is a hash-seeded `Math.sin` pseudo-random generator,
and `speciesProfile`/`buildStandDistribution`/`buildSubBlockPeriods` are
formulaic projections from hardcoded growth-rate constants, not measurements.
That file must never be treated as field ground truth.

**Critically, this trial data has never been promoted into the canonical
evidence-backed model.** `docs/architecture/canonical-state-v0.1.md` says so
explicitly: these are static frontend JSON artifacts, not
`observations.assertion`/`evidence.evidence_item` rows. The `field_campaign`
evidence `source_type` exists in the schema but is populated only in test
fixtures and a demo script (`backend/app/services/state/demo.py`), never with
this real data.

**Two data-quality anomalies found and excluded from reliance:** the NFC and
Tukuyu site registry entries list `available_measurement_ages_months` as
*every consecutive integer* from ~17 up to 1,949 and 1,564 respectively (i.e.
implying measurement campaigns for over a century, monthly) -- structurally
inconsistent with every other site's short, sparse, plausible campaign list
(e.g. Kisolanza: `[17, 29, 42, 56, 91]`). This looks like a placeholder/range
artifact in the registry generation, not real data. **Do not treat NFC's or
Tukuyu's age lists as real** until independently confirmed against their
actual `source_files`; their site coordinates and genus groups appear
consistent with the other sites and are not themselves in question.

**Spatial support caveat:** the registry gives a single representative point
per site, not a plot/stand polygon. A real trial site spans multiple entries
x multiple genus groups x (at some sites) hundreds of measurement rows --
almost certainly tens of hectares in true extent, not one pixel. Until real
plot boundaries are located or digitized, any EO extraction at these sites
must say explicitly that it uses a **point coordinate with an assumed buffer**,
not a canonical field-surveyed boundary -- this is a materially different
provenance from the Uganda CFR polygons (which came from
digitized/geometry-observation boundaries, still themselves
`UNVERIFIED_REPOSITORY_DERIVED`/exploratory per the existing EO-readiness
policy, but genuine polygons).

## 4. Tanzania geometry -- explicit statement

**No Tanzania CFR/AOI canonical polygon geometry exists.** `geo.aoi`/`geo.aoi_version`
contain Uganda CFRs only (656 AOIs, all `country=UG`). The 13 trial-site
points above are the only real Tanzania-referenced spatial evidence found
anywhere in the repository. Per instruction, this is stated plainly rather
than worked around: **Tanzania field/geometry data is not yet strong enough
for the same canonical-polygon treatment Uganda CFRs have.** Track B pilot
sites in Tanzania are point-based with an assumed buffer, not
canonical-polygon-based, until real plot boundaries are sourced.

## 5. Uganda CFR cohort -- real diversity available for Track B

Queried directly from the persisted August 2026 country pass (real values,
not estimates):

| Statistic | CFR | Area (ha) | NDVI mean | Latitude |
|---|---|---|---|---|
| Smallest | Sekazinga | 0.26 | -0.068 | -0.49 |
| p25 | Kihihi | 35.9 | 0.563 | -0.76 |
| Median | Epor | 223.5 | 0.622 | 2.40 |
| p75 | Musamya | 739.4 | 0.682 | 0.28 |
| Largest | Zulia | 92,559.3 | 0.340 | 4.03 |
| Lowest NDVI | Mala Island | 1.15 | -0.090 | 0.24 |
| Highest NDVI | Bunjazi | 79.95 | 0.845 | -0.34 |

All 656 already have a real August 2026 Sentinel-2 observation (NDVI/NDMI/NBR,
area-weighted moments-v1) to build on immediately -- these are not new EO
work, only new sensor layers added to AOIs that already have an S2 baseline.
Latitude spans -0.76 to 4.03 (~530km north-south), covering meaningfully
different rainfall/terrain regimes. `Mala Island` (1.15 ha, NDVI -0.09) is
almost certainly water/bare-ground-dominated, not degraded forest -- a useful
edge case, not a primary pilot candidate.

## 6. Schema/architecture readiness for multi-sensor extension

- No STAC code exists in the repository (`grep -r STAC backend` -> 0 hits).
  Per instruction, we are not building one; `config/eo/sensors.yaml` plus the
  existing `evidence.eo_source_item` (already keyed by
  `provider_key`/`collection_key`/`item_id`) is the source-identity mechanism.
- No dedicated sensor-registry table exists in PostgreSQL; the new
  `config/eo/sensors.yaml` is intentionally a versioned config file, not a
  database table, per instruction ("do not hard-code sensor semantics
  throughout service code" -- it does not say build a new schema for it, and
  a file is simpler to review/diff than a migration for registry metadata that
  changes as providers evolve).
- `evidence.source.data_class` already has a `SYNTHETIC` enum value distinct
  from `OBSERVED`/`REPORTED`/`DERIVED` -- if/when the Tanzania trial data is
  promoted into canonical evidence, it is unambiguously `OBSERVED`
  (`source_type='field_campaign'`), and any GEDI/L4A-derived AGBD ingested
  later is unambiguously `DERIVED`, never `OBSERVED`.
