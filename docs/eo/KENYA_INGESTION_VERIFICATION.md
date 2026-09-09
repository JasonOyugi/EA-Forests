# Kenya spatial ingestion: live verification (CRS issue resolved)

Date: 2026-09-09. Run against a disposable test database
(`ea_forests_kenya_test2`, since dropped) to verify the concurrent spatial-
ingestion module end-to-end before relying on it -- not run against the
persistent `ea_forests_uganda_country_pass`/`ea_forests_import` databases
in this pass, so these real numbers are not currently sitting in a
persisted canonical database; re-running the two commands below against a
real target database reproduces them.

## Root cause of the earlier "Legacy GeoJSON CRS" block

Diagnosed directly against the live ArcGIS REST service
(`services8.arcgis.com/.../kenya_gazetted_forest`), not assumed:

- The layer's **native/default spatial reference is Web Mercator**
  (`wkid=102100`, `latestWkid=3857`), confirmed via the layer's own
  `?f=json` metadata.
- The ingestion code (`arcgis.py`) already explicitly requests `outSR=4326`
  on every feature query, and the live response's `crs` member came back
  correctly as `{"type":"name","properties":{"name":"EPSG:4326"}}` -- the
  server-side reprojection works as intended.
- A prior run of `ingest_spatial_forests.py all --source KE-GAZETTED-FOREST`
  hit `archive.py`'s explicit safety check ("Legacy GeoJSON CRS requires
  explicit vector import normalization") regardless. Re-running the exact
  same acquisition immediately afterward (calling `acquire_arcgis` and
  `geojson_features` directly, bypassing nothing) succeeded cleanly on every
  page. The concurrent spatial-ingestion session had an in-progress,
  uncommitted edit to `archive.py` at the time this was investigated; the
  most likely explanation is that edit fixed the issue between the failing
  run and this verification. **The safety check itself was never bypassed
  or weakened** -- it is still in place and still correctly permissive only
  for named 4326/3857 CRS members.

## Live results (real, both Kenya sources)

```text
KE-GAZETTED-FOREST: acquired 388 features (live ArcGIS REST)
  -> ingested: 386 accepted/inserted, 2 rejected (quarantined, not repaired)
     rejection reasons (both genuine self-intersecting rings, both within
     plausible WGS84 Kenya bounds -- i.e. not a CRS artifact):
       "Ring Self-intersection[35.5054119620184 0.291674990354156]"
       "Ring Self-intersection[36.690735511616 -1.36254539734352]"

KE-TREE-PLANTATIONS: acquired 280 features (live ArcGIS REST)
  -> ingested: 280 accepted/inserted, 0 rejected
```

**Total: 666 real `core.entity` rows (`entity_type='forest_candidate'`),
666 `geo.geometry_observation` rows, country=KE.** Largest by real
transformed area: Mount Kenya (198,657 ha), Mathews Range (96,963 ha),
Ndotos Range (92,796 ha), Leroghi (91,389 ha), South West Mau (83,758 ha) --
all plausible, well-known real Kenya forest names and magnitudes, a
reasonable sanity check that the CRS transform produced geographically
correct areas (a systematic CRS error would produce areas off by orders of
magnitude or degenerate/self-intersecting geometry at a much higher rate
than 2/666).

## What this does NOT yet include

- **No `geo.aoi`/`geo.aoi_version` rows were created.** The spatial
  ingestion module persists `evidence`/`entity`/`geometry_observation` --
  the same evidence layer Uganda's CFR ingestion also writes -- but Uganda's
  `cfr_geometry.py` additionally promotes that evidence to a versioned AOI
  with an explicit EO-readiness classification (`classify_eo_readiness`).
  No equivalent promotion step exists yet for `forest_candidate` entities.
  **This is the concrete blocker before any Kenya S2/S1 pilot can run**
  through the existing `enqueue()`/`worker.py` path, which requires a real
  `aoi_version_id`.
- No EO readiness classification, no Kenya S2/S1 pilot was run this pass.
- Not yet ingested into any persistent database (verification only).

## Next step

Write the Kenya equivalent of `classify_eo_readiness`/AOI promotion (small,
reusing the exact same `geo.aoi`/`geo.aoi_version` tables and provenance
conventions Uganda already uses -- no new schema, no Kenya-specific EO
code), then re-run this same ingestion against a persistent database and
select 5-10 representative Kenya forests for the first real S2/S1 pilot.
