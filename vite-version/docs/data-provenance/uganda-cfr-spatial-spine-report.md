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
- EO READY: 654
- EO EXPLORATORY: 2
- EO BLOCKED: 5
- TOTAL EO-PROCESSABLE CFRS: 656
- TOTAL EO-PROCESSABLE AREA: 1239551.5 ha

## Blocked / ambiguous / record-only entries

| Name | Status | EO readiness | Reason |
| --- | --- | --- | --- |
| Acet | POLYGON_LINKED | BLOCKED_INVALID_GEOMETRY | Rings 1 and 2 overlap without clean containment |
| Nsinze | POLYGON_LINKED | BLOCKED_INVALID_GEOMETRY | Rings 3 and 4 overlap without clean containment |
| Kabula | AMBIGUOUS | BLOCKED_IDENTITY_AMBIGUOUS | Normalized name 'kabula' matches 2 boundary record(s) and 1 source record(s); refusing to guess the correspondence |
| Luvunya | POLYGON_LINKED | BLOCKED_INVALID_GEOMETRY | Rings 1 and 2 overlap without clean containment |
| Kabula (2) | RECORD_ONLY | BLOCKED_NO_POLYGON | No boundary export entry with a matching normalized name |

## Exploratory entries (in EO scope, provenance/precision flagged)

| Name | Reported area (ha) | Polygon area (ha) | Discrepancy | AOI version |
| --- | --- | --- | --- | --- |
| Katabalalu | 1350.991029 | 1786.5 | 32.2% | 0cbd187d-5819-4f32-bb5c-794980e0946d |
| Lwamunda | 4495.852101 | 6726.5 | 49.6% | 9201b346-458c-4a95-988c-31b015935db6 |
