import math
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import text

from app.api.canonical import DB, require_access
from app.services.ingestion.spatial.read_model import LATEST, query_forests, source_summary
from app.services.ingestion.spatial.registry import CLASSES, COUNTRIES, load_registry

# Planted-tree estates are real evidence but not part of any country's
# default national forest-estate view (regional observatory brief,
# section 2B) -- kept as an explicit opt-in layer, never silently blended
# into "the" estate for a country. Driven by the same semantic_class the
# source registry already assigns, so this holds for any future country
# without new country-specific code.
DEFAULT_CLASSES = CLASSES - {"tree_plantation"}

router = APIRouter(prefix="/api/canonical", tags=["Spatial evidence"],
                   dependencies=[Depends(require_access)])


def parse_bbox(value):
    try:
        values = tuple(float(x) for x in value.split(","))
    except ValueError as exc:
        raise ValueError("bbox must be west,south,east,north") from exc
    if (len(values) != 4 or not all(math.isfinite(x) for x in values)
            or not -180 <= values[0] < values[2] <= 180
            or not -90 <= values[1] < values[3] <= 90):
        raise ValueError("bbox must be a non-empty EPSG:4326 envelope; split antimeridian views")
    return values


def parse_filter(single, plural, allowed):
    values = set(x.strip() for x in f"{single or ''},{plural or ''}".split(",") if x.strip())
    if not values.issubset(allowed):
        raise ValueError(f"Unknown filter value: {', '.join(sorted(values - set(allowed)))}")
    return sorted(values)


@router.get("/forest-sources")
def forest_sources(db: DB, response: Response):
    response.headers["Cache-Control"] = "private, max-age=60"
    return source_summary(db)


@router.get("/forest-polygons")
def forest_polygons(db: DB, response: Response, bbox: str = Query(max_length=120),
                    country: str | None = None, source_key: str | None = None,
                    source_keys: str | None = Query(None, max_length=1500),
                    commercial_class: str | None = None, classes: str | None = None,
                    limit: int = Query(600, ge=1, le=2000), zoom: int = Query(8, ge=0, le=20),
                    entity_id: UUID | None = None):
    try:
        envelope = parse_bbox(bbox)
        sources = parse_filter(source_key, source_keys, load_registry())
        selected_classes = parse_filter(commercial_class, classes, CLASSES)
        # No explicit source or class filter -> default to the
        # non-plantation estate rather than every registered class.
        if not sources and not selected_classes:
            selected_classes = sorted(DEFAULT_CLASSES)
        if country and country not in COUNTRIES:
            raise ValueError("country must be UG, KE or TZ")
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    response.headers["Cache-Control"] = "private, max-age=60"
    return query_forests(db, envelope, country, sources, selected_classes, limit, zoom, entity_id)


@router.get("/forest-polygons/{observation_id}/evidence")
def forest_polygon_evidence(observation_id: UUID, db: DB):
    # Exact observation, same visibility predicate as map reads. Original source
    # records, filesystem paths and arbitrary metadata are not exposed.
    row = db.execute(text(LATEST + """
        SELECT l.id,l.entity_id,l.source_key,l.original_srid,l.method,l.precision_description,
               l.recorded_at,l.metadata,ev.id AS evidence_item_id,r.content_hash,r.imported_at,
               r.metadata->>'retrieved_at' AS retrieved_at
        FROM observations l JOIN evidence.evidence_item ev ON ev.id=l.evidence_item_id
        LEFT JOIN evidence.raw_ingest r ON r.id=ev.raw_ingest_id WHERE l.id=:id
    """), {"id": observation_id}).mappings().first()
    if not row:
        raise HTTPException(404, "Visible polygon evidence not found")
    result = dict(row)
    metadata = result.pop("metadata") or {}
    result["geometry_validity"] = metadata.get("geometry_validity", "valid (PostGIS constraint)")
    result["repair"] = metadata.get("repair")
    result["source_feature_id"] = metadata.get("source_feature_id", metadata.get("boundary_export_id"))
    return result
