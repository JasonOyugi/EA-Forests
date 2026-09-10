"""Generic geometry_observation -> geo.aoi -> geo.aoi_version promotion
(observatory v1, section 3). Reuses exactly the tables and provenance
conventions Uganda's ``cfr_geometry.py`` already established for CFRs --
no new schema, no country-specific spatial tables. Works for ANY entity
with an existing ``geo.geometry_observation``; the caller supplies the
analysis scope and provenance class appropriate to that source (this
module makes no country- or dataset-specific assumption).
"""

from __future__ import annotations

import hashlib

from sqlalchemy import func, select, text

from app.db import schema as s
from app.services.state.registry import insert_row

READY = "READY"
EXPLORATORY = "EXPLORATORY"
NORMALIZATION_VERSION = "generic-aoi-promotion/0.1"

# Same bar Uganda's CFR ingestion uses: only a provenance class this adequate
# earns READY. Nothing in the current Kenya sources (reported_public_sector_
# secondary, third_party_spatial_dataset) meets it -- both promote as
# EXPLORATORY, an honest reflection of unverified public-copy provenance,
# not a defect in this function.
PROVENANCE_ADEQUATE_FOR_READY = frozenset(
    {"official_kml", "surveyed", "verified_government_source", "authoritative_official"}
)


def classify_eo_readiness(provenance_class: str) -> str:
    return READY if provenance_class in PROVENANCE_ADEQUATE_FOR_READY else EXPLORATORY


def promote_geometry_to_aoi(
    session,
    *,
    entity_id: str,
    world_id: str,
    geometry_observation_id: str,
    analysis_scope: str,
    provenance_class: str,
    country: str,
    spatial_type: str,
    name: str | None = None,
    extra_metadata: dict | None = None,
) -> dict:
    """Idempotent: re-promoting the SAME geometry (by content hash) for the
    same (entity, analysis_scope) returns the existing AOI version rather
    than duplicating it -- matching the pattern already proven in
    ``cfr_geometry.ingest_cfr_polygons``.
    """
    geometry_row = (
        session.execute(
            select(s.geometry_observation).where(s.geometry_observation.c.id == geometry_observation_id)
        )
        .mappings()
        .one()
    )

    existing_aoi = (
        session.execute(
            select(s.aoi).where(
                s.aoi.c.geometry_owner_entity_id == entity_id,
                s.aoi.c.world_id == world_id,
                s.aoi.c.analysis_scope == analysis_scope,
            )
        )
        .mappings()
        .first()
    )
    aoi = (
        dict(existing_aoi)
        if existing_aoi
        else insert_row(
            session,
            s.aoi,
            world_id=world_id,
            geometry_owner_entity_id=entity_id,
            subject_entity_id=entity_id,
            name=name,
            analysis_scope=analysis_scope,
            # country/spatial_type are what GET /api/canonical/spatial-assets
            # filters on (backend/app/api/canonical.py) -- an AOI created
            # without them is invisible to every generic asset-lookup caller,
            # frontend included. Required kwargs here, not an optional extra,
            # so this cannot be omitted silently again (it was, for the first
            # Kenya promotion pass; fixed by backfilling those 666 rows once
            # this function required the fields).
            metadata={"eo_scope": True, "country": country, "spatial_type": spatial_type},
        )
    )

    area_m2 = session.scalar(
        text("SELECT ST_Area(geography(geometry)) FROM geo.geometry_observation WHERE id=:id"),
        {"id": geometry_observation_id},
    )
    bounds = (
        session.execute(
            text(
                "SELECT ST_XMin(geometry) AS minx, ST_YMin(geometry) AS miny, "
                "ST_XMax(geometry) AS maxx, ST_YMax(geometry) AS maxy "
                "FROM geo.geometry_observation WHERE id=:id"
            ),
            {"id": geometry_observation_id},
        )
        .mappings()
        .one()
    )
    geometry_wkt = session.scalar(
        text("SELECT ST_AsText(geometry) FROM geo.geometry_observation WHERE id=:id"),
        {"id": geometry_observation_id},
    )
    geometry_hash = hashlib.sha256(geometry_wkt.encode()).hexdigest()

    existing_version = (
        session.execute(
            select(s.aoi_version).where(
                s.aoi_version.c.aoi_id == aoi["id"],
                s.aoi_version.c.geometry_hash == geometry_hash,
                s.aoi_version.c.superseded_at.is_(None),
            )
        )
        .mappings()
        .first()
    )
    if existing_version:
        return {
            "aoi_id": str(aoi["id"]),
            "aoi_version_id": str(existing_version["id"]),
            "eo_readiness": existing_version["metadata"].get("eo_readiness"),
            "area_m2": float(existing_version["area_m2"]),
            "geometry_hash": geometry_hash,
            "already_promoted": True,
        }

    if area_m2 is None or area_m2 <= 0:
        raise ValueError(f"Geometry {geometry_observation_id} has non-positive area; refusing to promote")

    readiness = classify_eo_readiness(provenance_class)
    next_revision = 1 + (
        session.scalar(select(func.max(s.aoi_version.c.revision)).where(s.aoi_version.c.aoi_id == aoi["id"])) or 0
    )
    aoi_version = insert_row(
        session,
        s.aoi_version,
        aoi_id=aoi["id"],
        world_id=world_id,
        revision=next_revision,
        geometry_observation_id=geometry_observation_id,
        geometry_hash=geometry_hash,
        normalization_version=NORMALIZATION_VERSION,
        area_m2=area_m2,
        bounds={
            "minx": float(bounds["minx"]),
            "miny": float(bounds["miny"]),
            "maxx": float(bounds["maxx"]),
            "maxy": float(bounds["maxy"]),
        },
        source_id=geometry_row["source_id"],
        evidence_item_id=geometry_row["evidence_item_id"],
        metadata={
            "eo_readiness": readiness,
            "eo_readiness_policy": NORMALIZATION_VERSION,
            "provenance_class": provenance_class,
            "eo_scope": True,
            "analysis_scope": analysis_scope,
            **(extra_metadata or {}),
        },
    )
    return {
        "aoi_id": str(aoi["id"]),
        "aoi_version_id": str(aoi_version["id"]),
        "eo_readiness": readiness,
        "area_m2": float(area_m2),
        "geometry_hash": geometry_hash,
        "already_promoted": False,
    }
