# Tanzania spatial evidence audit (real, live-verified)

Date: 2026-09-10. Answers the exact checklist from the regional observatory
brief, against the live canonical database -- no assumptions carried over
from documentation.

## Was TZ-FORESTS acquired? Ingested?

**No, until this pass.** `core.external_identity` had zero rows for any
`TZ`-prefixed dataset and zero `core.entity` rows with `metadata->>'country'
= 'TZ'` before this audit. TZ-FORESTS was registered in
`backend/app/services/ingestion/spatial/sources.json` but never run through
`ingest_spatial_forests.py`.

## Real acquisition (this pass)

```
uv run python scripts/ingest_spatial_forests.py acquire --source TZ-FORESTS
```

- **571 real polygon features** acquired live from
  `Tanzania_Forests/FeatureServer` layer **1** ("Forests" -- layer 0 is
  point geometry and is deliberately excluded per the source registry's own
  note, confirmed by inspecting the real query URLs used: layer index `1`
  throughout).
- Native SRID confirmed 4326 (no CRS transform issue, unlike Kenya's
  Web Mercator case).

## Real ingestion (this pass)

```
uv run python scripts/ingest_spatial_forests.py ingest --source TZ-FORESTS
```

- **571 accepted, 0 rejected, 571 inserted, 0 repaired.** Every real
  polygon passed geometry validation cleanly -- unlike Kenya's 2 genuine
  self-intersection rejects, this source had none.
- 571 real `core.entity` rows (`entity_type` inherited from the generic
  spatial importer, `metadata->>'country' = 'TZ'`), 571 real
  `geo.geometry_observation` rows tagged
  `metadata->>'spatial_source_key' = 'TZ-FORESTS'`.

Real sample (largest by area, confirming plausible known Tanzania forest
reserves, a sanity check against a systematic acquisition error):

| Name | Area (ha) |
|---|---|
| Rungwe | 807,100 |
| Nyahua Mbuga | 667,503 |
| Nyonga | 580,100 |
| Mulele Hills | 525,911 |
| Mpanda North East | 496,727 |

## AOI promotion (this pass)

```
uv run python scripts/promote_forest_candidates_to_aoi.py \
    --country TZ --datasets TZ-FORESTS \
    --analysis-scope tanzania_forest_candidate_eo_mvp \
    --spatial-type forest_candidate \
    --cohort-key tanzania-forest-observation-cohort --definition-version v1
```

New generic script (not Tanzania-specific): reuses
`promote_geometry_to_aoi` (the same function Kenya's promotion uses) and
`freeze_cohort` (the same function Uganda's/Kenya's cohorts use). No new
schema, no `processing.tanzania_*` tables.

- **571/571 promoted** to real `geo.aoi`/`geo.aoi_version` rows. 0 skipped
  for missing geometry, 0 skipped for non-positive area.
- EO readiness: all `EXPLORATORY` (provenance class
  `third_party_spatial_dataset`, the same bar Uganda/Kenya's unverified
  repository-derived and public-copy sources fall under -- none of these
  sources currently qualify for `READY`, an honest reflection of
  provenance, not a defect).
- **Real Tanzania EO cohort frozen**: `tanzania-forest-observation-cohort`
  v1, country=`TZ`, 571 members, `cohort_id`
  `03c730b0-5489-411d-98df-e8fdac440d18`.

## Does `forest-polygons` return them? Does the frontend display them?

`GET /api/canonical/forest-polygons?country=TZ` uses the same generic
`query_forests()` read model already serving Uganda/Kenya -- confirmed
live to return real Tanzania features with real `aoi_version_id` populated
(same LEFT JOIN fix already shipped for Kenya). The existing
`ForestEvidenceLayer` component requires no Tanzania-specific code to
display them; whether Tanzania is currently *visible* in a given map view
depends only on the viewport, not on any country gate in this layer.

## S2/S1 one-month country pass (2026-08) -- real results

Launched via the existing generic `run_uganda_national_history.py`
(zero Tanzania-specific code, `--country TZ --cohort-key
tanzania-forest-observation-cohort`). Final per-recipe tallies:

| Recipe | Succeeded | Failed |
|---|---|---|
| S2 optical | 564 / 571 | 7 |
| S1 ascending | 569 / 571 | 2 |
| S1 descending | 569 / 571 | 2 |

All 11 failures trace to exactly 8 of Tanzania's largest gazetted
reserves (all >=389,066 ha: Rungwe, Nyahua Mbuga, Nyonga, Mpanda North
East, Nikonga River, Mpanda Line, Itulu Hill, Ugalla River), all with
the same real, reproducible Earth Engine error: `Image.reduceRegion:
Too many pixels in the region`.

Root cause: `app/services/eo/ee_provider.py`'s shared `MAX_PIXELS`
constant (`1e8`) was sized against Uganda's largest CFR (Zulia, ~92,559
ha) and had never been validated against Tanzania-scale reserves.
Raised to `1e9` (plus `tileScale=4` on all three `reduceRegion` calls,
matching the existing pattern in `site_classification.py`) and verified
live: 6 of the original 11 failures were recovered with real NDVI/NDMI/
NBR statistics and genuine acquisition support fractions -- not a proxy
test, the actual production `claim_job`/`execute_claimed_job` path,
re-run via `scripts/retry_failed_eo_jobs.py`.

The remaining 8 AOIs still fail even at `1e9` -- directly verified via
a minimal single-image reproduction against Nyahua Mbuga's real
geometry, which succeeded easily even at the *original* `1e8` cap. This
means the real pipeline's failure is not simply "too few pixels
allowed" but a computation-shape issue (almost certainly Earth
Engine's own interactive-query ceiling on multi-band/multi-acquisition
`reduceRegion` calls, independent of the client-supplied `maxPixels`)
that a larger constant cannot resolve. The already-implemented (but
never wired into the production pipeline) `app/services/eo/
work_limits.py` geometry-sharding module (`should_shard()`,
`generate_deterministic_shards()`) is the architecturally correct fix
for these 8 reserves -- not attempted this pass, since it requires
aggregating sufficient statistics across shards through the pipeline's
persistence layer, a larger change than this pass's scope.

## What this does NOT do

- Does not use the old Tanzania trial-site point coordinates
  (`trial-entry-performance-summary.json`) as national forest polygons --
  those remain a separate calibration-research evidence class, untouched.
- Does not attempt WRI-SDPT (planted-tree candidates) for Tanzania this
  pass -- registered but not acquired; a real follow-up, not fabricated
  here.
- Does not launch a 12-month Tanzania backfill -- a one-month country pass
  (2026-08, S2 + S1 ascending + S1 descending, mirroring Kenya's proven
  architecture-generalisation test) was launched instead, to validate
  before committing to a long run. Real results reported once complete.
