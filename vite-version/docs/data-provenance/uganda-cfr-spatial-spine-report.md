# Uganda CFR spatial-spine inventory

Derived reconciliation report. Not a source of truth: source records remain `central-forest-reserves.json`, boundary polygons remain `generated-boundaries.ts`, and canonical spatial evidence lives in `geo.aoi` / `geo.aoi_version` in PostgreSQL/PostGIS.

## Summary

- TOTAL CFR RECORDS: 661
- TOTAL CFR POLYGONS: 661
- LINKED: 659
- RECORD ONLY: 1
- POLYGON ONLY: 0
- AMBIGUOUS: 1
- INVALID: 3
- EO READY: 0
- EO EXPLORATORY: 656
- EO BLOCKED: 5
- TOTAL EO-PROCESSABLE CFRS: 656
- TOTAL EO-PROCESSABLE AREA: 1239551.5 ha

EO readiness reflects geometry validity and provenance adequacy only. Every processable CFR here is `EXPLORATORY`: their polygons are all `UNVERIFIED_REPOSITORY_DERIVED` (no recoverable KML/GeoJSON artifact or transformation script), so none currently qualify as `READY`. `READY` and `EXPLORATORY` are both EO-processable; area discrepancy and ring-topology review are tracked as independent flags below, not folded into readiness.

## Blocked / ambiguous / record-only entries

| Name | Status | EO readiness | Reason |
| --- | --- | --- | --- |
| Acet | POLYGON_LINKED | BLOCKED_INVALID_GEOMETRY | Rings 1 and 2 overlap without clean containment |
| Nsinze | POLYGON_LINKED | BLOCKED_INVALID_GEOMETRY | Rings 3 and 4 overlap without clean containment |
| Kabula | AMBIGUOUS | BLOCKED_IDENTITY_AMBIGUOUS | Normalized name 'kabula' matches 2 boundary record(s) and 1 source record(s); refusing to guess the correspondence |
| Luvunya | POLYGON_LINKED | BLOCKED_INVALID_GEOMETRY | Rings 1 and 2 overlap without clean containment |
| Kabula (2) | RECORD_ONLY | BLOCKED_NO_POLYGON | No boundary export entry with a matching normalized name |

## Area-discrepancy-flagged entries (in EO scope; independent of readiness)

| Name | Reported area (ha) | Polygon area (ha) | Discrepancy | AOI version |
| --- | --- | --- | --- | --- |
| Katabalalu | 1350.991029 | 1786.5 | 32.2% | 04f1efb3-f61c-4495-b4b6-f4bf9e591b68 |
| Lwamunda | 4495.852101 | 6726.5 | 49.6% | 4d4cb610-f911-410d-a3eb-2c877a821752 |
