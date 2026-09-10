"""Generic geometry_observation -> geo.aoi -> geo.aoi_version promotion
(observatory v1, section 3): must work for ANY entity/geometry, be
idempotent on the same geometry content, and classify EO readiness from
the caller-supplied provenance class -- never invent one.
"""

import pytest
from sqlalchemy import select

from app.db import schema as s
from app.services.ingestion.spatial.aoi_promotion import promote_geometry_to_aoi
from app.services.state.registry import audit_context, insert_row

pytestmark = pytest.mark.integration

TEST_WKT = "POLYGON((36.0 -1.0,36.1 -1.0,36.1 -1.1,36.0 -1.1,36.0 -1.0))"


def _make_entity_with_geometry(db, wkt=TEST_WKT):
    world_id = db.scalar(select(s.world.c.id).where(s.world.c.name == "production"))
    audit_context(db, "test", "create test forest_candidate entity")
    source = insert_row(db, s.source, source_type="test_source", title="Test source")
    evidence_item = insert_row(db, s.evidence_item, source_id=source["id"], kind="spatial_polygon")
    entity = insert_row(
        db, s.entity, entity_type="forest_candidate", canonical_name="Test Forest", metadata={"country": "KE"}
    )
    geometry = insert_row(
        db,
        s.geometry_observation,
        entity_id=entity["id"],
        world_id=world_id,
        geometry=f"SRID=4326;{wkt}",
        method="digitised",
        precision_description="test",
        source_id=source["id"],
        evidence_item_id=evidence_item["id"],
        metadata={"authority_class": "third_party_spatial_dataset", "source_name": "Test Forest"},
    )
    return world_id, entity, geometry


def test_promote_creates_aoi_and_version(db, store):
    world_id, entity, geometry = _make_entity_with_geometry(db)
    result = promote_geometry_to_aoi(
        db,
        entity_id=str(entity["id"]),
        world_id=str(world_id),
        geometry_observation_id=str(geometry["id"]),
        analysis_scope="kenya_forest_candidate_eo_mvp",
        provenance_class="third_party_spatial_dataset",
        name="Test Forest",
    )
    assert result["already_promoted"] is False
    assert result["eo_readiness"] == "EXPLORATORY"
    assert result["area_m2"] > 0

    row = db.execute(
        select(s.aoi_version).where(s.aoi_version.c.id == result["aoi_version_id"])
    ).mappings().one()
    assert str(row["geometry_observation_id"]) == str(geometry["id"])
    assert row["metadata"]["analysis_scope"] == "kenya_forest_candidate_eo_mvp"


def test_promoting_same_geometry_twice_is_idempotent(db, store):
    world_id, entity, geometry = _make_entity_with_geometry(db)
    kwargs = {
        "entity_id": str(entity["id"]),
        "world_id": str(world_id),
        "geometry_observation_id": str(geometry["id"]),
        "analysis_scope": "kenya_forest_candidate_eo_mvp",
        "provenance_class": "third_party_spatial_dataset",
    }
    first = promote_geometry_to_aoi(db, **kwargs)
    second = promote_geometry_to_aoi(db, **kwargs)
    assert second["already_promoted"] is True
    assert second["aoi_version_id"] == first["aoi_version_id"]


def test_authoritative_provenance_classifies_ready(db, store):
    world_id, entity, geometry = _make_entity_with_geometry(db)
    result = promote_geometry_to_aoi(
        db,
        entity_id=str(entity["id"]),
        world_id=str(world_id),
        geometry_observation_id=str(geometry["id"]),
        analysis_scope="kenya_forest_candidate_eo_mvp",
        provenance_class="authoritative_official",
    )
    assert result["eo_readiness"] == "READY"
