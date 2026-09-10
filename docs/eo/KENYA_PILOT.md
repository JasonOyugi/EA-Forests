# Kenya AOI promotion and real S2/S1 pilot

Date: 2026-09-10. Run against the persistent `ea_forests_uganda_country_pass`
database (the shared canonical production database; despite its name it is
not Uganda-only -- `core.world`/country tagging distinguishes countries
within one database, not separate databases per country).

## AOI promotion

`backend/scripts/promote_kenya_forests_to_aoi.py` promoted every real,
previously-ingested Kenya `forest_candidate` entity's current
`geo.geometry_observation` to a `geo.aoi`/`geo.aoi_version`, reusing the
exact generic promotion function
(`app.services.ingestion.spatial.aoi_promotion.promote_geometry_to_aoi`)
built this pass -- no Kenya-specific spatial tables, no new schema beyond
what Uganda's CFR path already uses.

```text
identities_seen: 666
promoted_new: 666
skipped_no_geometry: 0
by_source_family: {"KE-GAZETTED-FOREST": 386, "KE-TREE-PLANTATIONS": 280}
eo_readiness: EXPLORATORY for all (provenance classes
  reported_public_sector_secondary / third_party_spatial_dataset --
  unverified public copies, same bar Uganda's CFR polygons are held to;
  neither reaches READY)
```

**Real bug found and fixed during this step:** the two Kenya source
datasets independently generate `layer:feature_id` identity keys (e.g.
`"0:1"`), which collide with each other when frozen into ONE cohort --
`processing.eo_cohort_member`'s uniqueness is `(cohort_id,
source_record_key)`, not dataset-scoped. Fixed by namespacing the cohort
member key as `f"{dataset}::{source_record_key}"` in the promotion script
(not a schema change -- `external_identity`'s own `(dataset,
source_record_key, role)` key was never affected).

## Kenya cohort

`kenya-forest-observation-cohort` / `v1`, frozen via the same
`app.services.eo.cohort.freeze_cohort` Uganda uses:

```text
country: KE
member_count: 666
```

## Kenya pilot: real S2 + S1 ascending + S1 descending, August 2026

`backend/scripts/run_kenya_pilot.py` selected 8 real assets deterministically
by AREA PERCENTILE within each source family (never by "shows an
interesting change"):

| source_record_key | family | area (ha) |
|---|---|---|
| KE-GAZETTED-FOREST::0:53 | gazetted | 1.0 |
| KE-GAZETTED-FOREST::0:101 | gazetted | 140.0 |
| KE-GAZETTED-FOREST::0:21 | gazetted | 1,083.9 |
| KE-GAZETTED-FOREST::0:119 | gazetted | 198,657.1 |
| KE-TREE-PLANTATIONS::0:1 | plantation | 3.3 |
| KE-TREE-PLANTATIONS::0:73 | plantation | 118.1 |
| KE-TREE-PLANTATIONS::0:92 | plantation | 424.8 |
| KE-TREE-PLANTATIONS::0:126 | plantation | 20,369.4 |

Ran through the SAME `enqueue`/`claim_job`/`execute_claimed_job` durable
job pipeline Uganda's national backfill uses, with the SAME three EO
recipes (`s2-sr-optical-v1`, `s1-grd-backscatter-ascending-v1`,
`-descending-v1`) -- zero Kenya-specific EO code.

**Result: 24/24 work units (8 assets x 3 sensor lanes) succeeded.** This is
the architecture-generalization test the programme called for: the same
canonical pipeline that has been running for Uganda for weeks worked on a
different country, different source data, different entity type
(`forest_candidate` vs `central-forest-reserves`), on the first real
attempt (after fixing the two bugs above and a transient DB connection
timeout, unrelated to the code).

## What this does NOT yet establish

- Only one month (2026-08) has been run -- no Kenya observation history yet,
  no completeness matrix entries beyond this single month.
- `eo_readiness: EXPLORATORY` for all 666 AOIs means this pilot's results
  are evidence the pipeline works, not evidence of surveyed/authoritative
  Kenya forest boundaries -- same caveat Uganda's CFRs carry.
- No Kenya change assessment, no Kenya asset-map UI wiring.
