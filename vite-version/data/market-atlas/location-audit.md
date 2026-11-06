# Market Atlas location audit

Generated: 2026-11-06T06:44:58.798Z

| Measure | Before | After |
|---|---:|---:|
| Published actors | 728 | 728 |
| Actors with a mapped point | 0 | 278 |
| Verified site/gate coordinates | 0 | 0 |
| Approximate/locality points | 0 | 278 |
| Actors without a point | 728 | 450 |

Coordinate confidence among mapped actors: high 3, medium 24, low 254. These are source confidence labels, not a claim of surveyed precision.

Direct legacy matches: 122 of 222 eligible source records. Additional actors placed at a sourced town/locality centroid: 87. OSM locality centers for workbook-named towns: 58, from 31 curated features. Original source coordinates were restored for 4 legacy display-offset markers. The commercial-forests file has 13 records without usable per-record provenance, so none were promoted.

The direct matching rule requires an exact normalized name or alias, country, and relevant market role. Duplicate candidates need unique phone/domain corroboration or remain in review. Town-derived points require a named locality in the canonical workbook, a unique source feature, and matching administrative context where available. OSM feature centers are approximate and do not establish a site, yard, or gate coordinate. No region center or unsourced coordinate is substituted for a site.

## Uganda supplied-map enrichment

19 markers across 15 actors were matched from the Chinese Processors and Large Private Commercial Forests layers of Ugandabmap.kml. Curated matches and exclusions are in [uganda-kml-locations.json](./uganda-kml-locations.json). Original KML SHA-256: `85bf45f3aa75a4ba6df45e82fa9303a991bb8ead5151e36ff98f4933422a7268`.

These are low-confidence, user-supplied site markers: original observation date, current operating status, ownership and gate accuracy are unverified. Plantation markers are not factory gates. The Achwa description says allocated and not planted; no current planting claim is made. Capacity figures were not imported. 7 markers remain in review, including the undescribed CFID point that conflicts with the near-Kapeka workbook locality.

Actors with multiple location records: 390; actors with multiple distinct mapped points: 6. Location records can be overlapping evidence for one place and should not automatically be counted as distinct sites.

Unresolved/low-confidence web-enrichment queue (704 records), direct-match audit, and 2 ambiguous legacy match(es) are in [sync-report.json](./sync-report.json). Check official actor contact pages first, then authoritative registries, then directories. Keep locality precision and source URLs on every future point.
