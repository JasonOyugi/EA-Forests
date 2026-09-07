# Uganda CFR spatial-spine: source audit and provenance

Audit date: 2026-09-07. This documents the audit behind
`uganda-cfr-spatial-spine-inventory.json` / `-report.md` and the ingestion in
`backend/app/services/ingestion/cfr_boundaries.py` and `cfr_geometry.py`.

## Source representations

| File | Records | Identity | Geometry |
| --- | --- | --- | --- |
| `vite-version/src/app/shop/data/market-databases/central-forest-reserves.json` | 661, keyed by reserve name | dataset key (name) | `lon`/`lat` centroid only |
| `vite-version/src/app/shop/data/generated-boundaries.ts` (`ugandaCfrs`) | 661 entries | `id` slug + `name` | one or more coordinate rings (`polygons`) |

Both files were introduced whole in single commits (`e83351d` for the JSON,
`4568308` for the boundary export); neither commit, nor any other commit in
the repository's history, nor any script under `backend/scripts` or
`vite-version/scripts`, contains a KML/GeoJSON parser or a transformation
pipeline for either file. The JSON's own `"Data source": "Ugandabmap.kml"`
field is a claim about the *point* dataset; it does not establish provenance
for the separately authored polygon export, which has no recoverable
original artifact. The boundary export's geometry is therefore classified
`UNVERIFIED_REPOSITORY_DERIVED` and ingested with `method="digitised"`
(`geo.geometry_observation.method`), never `official_kml`.

Five of the 661 JSON records (`Lodonga`, `Ragem`, `Achwera`, `Koreng`,
`Koboko`) carry an explicit `"Comments": "Dummy functional test data..."`
marker and matching `test_*` placeholder values; the existing
`MarketImporter.synthetic_record` heuristic already routes exactly these five
into `legacy-import-quarantine`, confirmed by direct inspection, not assumed.

## Reconciliation

There is no shared stable ID between the two files. Reconciliation
(`cfr_boundaries.reconcile`) matches on normalized reserve name only, and
refuses to guess past a collision:

- 659 of 661 JSON records match exactly one boundary entry by normalized
  name: `POLYGON_LINKED`.
- `Kabula`: two physically distinct boundary entries share both `id`
  (`cfr-kabula`) and `name` ("Kabula") — a real duplicate in the boundary
  export, not a parsing artifact (their `center` coordinates are ~307 km
  apart). The JSON separately lists `Kabula` and `Kabula (2)` as distinct
  reserves. Neither JSON record can be confidently assigned to
  either boundary entry, so both are `AMBIGUOUS` (`Kabula`) / `RECORD_ONLY`
  (`Kabula (2)`, which has no candidate boundary at all under its own name).
- 0 boundary entries are `POLYGON_ONLY` (every boundary name matches exactly
  one JSON record, aside from the Kabula collision above).

## Geometry validity and topology

Each linked CFR's rings are classified as shells or holes using real PostGIS
containment (`ST_Contains`/`ST_Intersects`), not assumed ring order: a ring's
fill parity is the number of other rings that geometrically contain it (even
= shell/island, odd = hole). An overlap between two rings that is neither
disjoint nor a clean containment is treated as a real topology defect.

Of 659 linked CFRs, 3 (`Acet`, `Nsinze`, `Luvunya`) have rings that overlap
without clean containment — a genuine defect in the boundary export, rejected
as `BLOCKED_INVALID_GEOMETRY` rather than silently unioned or repaired. The
other 656 produce a valid `Polygon`/`MultiPolygon` (50 CFRs have more than one
ring; PostGIS confirms these are predominantly disjoint multi-part reserves,
not holes).

## EO readiness (provenance-driven, corrected 2026-09-07)

`EO_READINESS_POLICY = "cfr-eo-readiness/0.2"`: `classify_eo_readiness`
reflects **geometry validity and provenance adequacy only**. `READY` requires
a provenance class this repository has actually verified as adequate for
operational use (e.g. a reviewed official/surveyed import); `EXPLORATORY` is
everything else with a technically valid polygon. Since every CFR polygon in
this ingestion path is `UNVERIFIED_REPOSITORY_DERIVED` (no recoverable
original KML/GeoJSON artifact, no known transformation history, no known
digitisation method), **all 656 geometrically valid, unambiguously linked
CFRs are `EXPLORATORY`; none are `READY`**. `READY` and `EXPLORATORY` are
both fully EO-processable per the project's MVP assumption (section 9) —
this correction only stops the pipeline from calling unverified geometry
"ready" merely because its area happens to agree with the source record.

An earlier revision of this document and importer (policy `0.1`) folded area
agreement into the readiness classification, which conflated two unrelated
signals: how well-attested a boundary's origin is, and how closely its area
matches an independently reported figure. Those are now tracked as
independent, non-collapsing fields on every ingested `geo.aoi_version`:

- `area_discrepancy_flag` (bool): reported vs. polygon-derived area disagree
  by more than 20%. Currently true for `Katabalalu` (32.2%) and `Lwamunda`
  (49.6%); the polygon export and the point dataset otherwise agree to
  within roughly 1% for the rest, suggesting a common (but unrecoverable)
  upstream source.
- `ring_topology_review_required` (bool): a CFR's rings needed containment
  depth greater than one to resolve (none currently).

Neither flag changes `eo_readiness`; both remain visible for review priority.

`geometry_observation.method = "repository_derived"` (not `"digitised"`,
which would imply a specific human tracing method not evidenced here).
Every such row's `metadata` additionally records `provenance_class`,
`original_geometry_artifact: "unavailable"`, `transformation_history:
"unknown"`, and `digitisation_method: "unknown"` so no API/UI consumer can
imply an official NFA boundary, a surveyed geometry, or a verified
government geometry without that evidence actually existing.
