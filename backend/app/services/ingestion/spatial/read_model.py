"""Whitelisted display metadata and spatial queries over immutable canonical observations."""
import json

from sqlalchemy import text

from .registry import load_registry

# The legacy source remains restricted and unchanged. Its already-ingested
# geometry is read alongside new sources, without manufacturing new observations.
LATEST = """
WITH observations AS (
 SELECT g.*, e.canonical_name, src.publisher, src.uri AS reference_url,
        src.metadata->'spatial_registry' AS registry, av.id AS aoi_version_id,
        coalesce(g.metadata->>'spatial_source_key',
            CASE WHEN src.title='generated-boundaries.ts (ugandaCfrs)'
                 THEN 'UG-CFR-REPOSITORY' END) AS source_key,
        coalesce(g.metadata->>'identity_key',g.metadata->>'boundary_export_id',g.entity_id::text) AS feature_key,
        coalesce(g.metadata->>'country',
            CASE WHEN src.title='generated-boundaries.ts (ugandaCfrs)' THEN 'UG' END) AS country,
        coalesce(g.metadata->>'commercial_class',
            CASE WHEN src.title='generated-boundaries.ts (ugandaCfrs)' THEN 'official_forest_reserve' END) AS commercial_class
 FROM geo.geometry_observation g
 JOIN core.entity e ON e.id=g.entity_id
 JOIN core.world w ON w.id=g.world_id
 JOIN evidence.source src ON src.id=g.source_id
 JOIN evidence.evidence_item ev ON ev.id=g.evidence_item_id AND ev.source_id=g.source_id
 -- Nullable: not every commercial-forest polygon has been promoted to an
 -- EO-processable AOI version. A non-null aoi_version_id is what a caller
 -- (the frontend Observatory drawer) needs to know EO evidence can exist
 -- for this polygon at all, before asking for it.
 LEFT JOIN geo.aoi_version av ON av.geometry_observation_id=g.id AND av.superseded_at IS NULL
 WHERE w.kind='production' AND NOT w.allow_synthetic
   AND src.access IN ('public','restricted')
   AND src.data_class <> 'SYNTHETIC' AND ev.data_class <> 'SYNTHETIC'
   AND g.superseded_at IS NULL AND ST_Dimension(g.geometry)=2
   AND (g.metadata ? 'spatial_source_key' OR src.title='generated-boundaries.ts (ugandaCfrs)')
), latest AS (
 SELECT DISTINCT ON (source_key,feature_key) * FROM observations
 ORDER BY source_key,feature_key,recorded_at DESC,id DESC
)
"""


def feature_properties(row, registry):
    meta = row["metadata"] or {}
    definition = registry.get(row["source_key"], {})
    return {
        "entity_id": str(row["entity_id"]), "geometry_observation_id": str(row["id"]),
        "aoi_version_id": str(row["aoi_version_id"]) if row["aoi_version_id"] else None,
        "name": row["canonical_name"], "source_name": meta.get("source_name", row["canonical_name"]),
        "country": row["country"], "source_key": row["source_key"],
        "source_feature_id": meta.get("source_feature_id", meta.get("boundary_export_id")),
        "publisher": row["publisher"], "dataset_version": meta.get("dataset_version", definition.get("dataset_version")),
        "data_vintage": meta.get("data_vintage", definition.get("data_vintage")),
        "commercial_class": row["commercial_class"],
        "authority_class": meta.get("authority_class", definition.get("authority_class")),
        "area_ha": meta.get("area_ha"), "geometry_area_ha": float(row["area_ha"]),
        "retrieved_at": meta.get("retrieved_at"), "reference_url": definition.get("reference_url"),
        "evidence_url": f"/api/canonical/forest-polygons/{row['id']}/evidence",
    }


def query_forests(db, bbox, country=None, source_keys=None, classes=None, limit=600, zoom=8,
                  entity_id=None):
    registry = load_registry()
    tolerance = 0 if zoom >= 14 else min(0.02, 0.5 / (2 ** max(zoom - 2, 0)))
    params = {"west": bbox[0], "south": bbox[1], "east": bbox[2], "north": bbox[3],
              "limit": limit + 1, "tolerance": tolerance}
    filters = ["ST_Intersects(geometry,ST_MakeEnvelope(:west,:south,:east,:north,4326))"]
    if country:
        filters.append("country=:country")
        params["country"] = country
    if source_keys:
        filters.append("source_key=ANY(:source_keys)")
        params["source_keys"] = list(source_keys)
    if classes:
        filters.append("commercial_class=ANY(:classes)")
        params["classes"] = list(classes)
    if entity_id:
        filters.append("entity_id=:entity_id")
        params["entity_id"] = entity_id
    # Shape coordinates in GeoJSON are deliberately rounded only after a
    # topology-safe precision reduction, never by ST_AsGeoJSON alone.
    rows = db.execute(text(LATEST + """
 SELECT *, ST_AsGeoJSON(ST_ReducePrecision(ST_SimplifyPreserveTopology(geometry,:tolerance),1e-8),9) AS geojson,
           ST_Area(geometry::geography)/10000 AS area_ha
 FROM latest WHERE """ + " AND ".join(filters) + " ORDER BY source_key,feature_key LIMIT :limit"), params).mappings()
    features, size, truncated = [], 0, False
    for row in rows:
        if len(features) >= limit:
            truncated = True
            break
        geometry = json.loads(row["geojson"])
        if not geometry.get("coordinates"):
            # Precision reduction can erase exceptionally small features.
            geometry = json.loads(db.scalar(text(
                "SELECT ST_AsGeoJSON(geometry,15) FROM geo.geometry_observation WHERE id=:id"),
                {"id": row["id"]}))
        feature = {"type": "Feature", "id": str(row["id"]), "geometry": geometry,
                   "properties": feature_properties(row, registry)}
        size += len(json.dumps(feature).encode())
        if size > 8 * 1024 * 1024:
            truncated = True
            break
        features.append(feature)
    return {"type": "FeatureCollection", "features": features, "bbox": list(bbox),
            "meta": {"returned": len(features), "truncated": truncated,
                     "simplification_degrees": tolerance, "canonical_crs": "EPSG:4326",
                     "area_note": "Geometry areas overlap across sources; do not sum as unique land area."}}


def source_summary(db):
    rows = db.execute(text(LATEST + """
        SELECT source_key,country,count(*) AS features,
               sum(ST_Area(geometry::geography)/10000) AS geometry_area_ha
        FROM latest GROUP BY source_key,country ORDER BY source_key,country
    """)).mappings().all()
    results = []
    for key, source in load_registry().items():
        counts = [r for r in rows if r["source_key"] == key]
        total = sum(r["features"] for r in counts)
        results.append({"source_key": key, "title": source["title"], "map_label": source["map_label"],
            "countries": source["countries"], "publisher": source["publisher"],
            "commercial_class": source["semantic_class"], "authority_class": source["authority_class"],
            "dataset_version": source["dataset_version"], "data_vintage": source["data_vintage"],
            "rights": source["rights"], "reference_url": source["reference_url"], "notes": source["notes"],
            "status": "available" if total else "registered_raster" if source["source_type"] == "raster" else "pending_acquisition",
            "features": total, "geometry_area_ha": sum(float(r["geometry_area_ha"]) for r in counts),
            "by_country": [{"country": r["country"], "features": r["features"],
                            "geometry_area_ha": float(r["geometry_area_ha"])} for r in counts]})
    return results
