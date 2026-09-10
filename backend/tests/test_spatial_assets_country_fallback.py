"""geo.aoi is immutable once created (history_guard blocks every UPDATE),
so an AOI promoted before its metadata.country/spatial_type were
populated can never be corrected in place -- exactly what happened for
Kenya's first 666 real promotions. GET /api/canonical/spatial-assets must
still find those rows, falling back to the frozen EO cohort's own
country and the entity's own entity_type, without ever mutating the
historical row.
"""

import pytest
from sqlalchemy import select, text

from app.api.canonical import spatial_assets
from app.db import schema as s
from app.services.eo.cohort import freeze_cohort
from app.services.ingestion.spatial.aoi_promotion import promote_geometry_to_aoi
from app.services.state.registry import audit_context, insert_row

pytestmark = pytest.mark.integration

TEST_WKT = "POLYGON((36.0 -1.0,36.1 -1.0,36.1 -1.1,36.0 -1.1,36.0 -1.0))"


def _make_entity_with_geometry(db, name):
    world_id = db.scalar(select(s.world.c.id).where(s.world.c.name == "production"))
    audit_context(db, "test", "create test forest_candidate entity")
    source = insert_row(db, s.source, source_type="test_source", title="Test source")
    evidence_item = insert_row(db, s.evidence_item, source_id=source["id"], kind="spatial_polygon")
    entity = insert_row(db, s.entity, entity_type="forest_candidate", canonical_name=name, metadata={"country": "KE"})
    geometry = insert_row(
        db, s.geometry_observation, entity_id=entity["id"], world_id=world_id, geometry=f"SRID=4326;{TEST_WKT}",
        method="digitised", precision_description="test", source_id=source["id"], evidence_item_id=evidence_item["id"],
        metadata={"authority_class": "third_party_spatial_dataset", "source_name": name},
    )
    return world_id, entity, geometry


def test_aoi_with_correct_metadata_is_found_directly(db, store):
    world_id, entity, geometry = _make_entity_with_geometry(db, "Correctly Tagged Forest")
    promote_geometry_to_aoi(
        db, entity_id=str(entity["id"]), world_id=str(world_id), geometry_observation_id=str(geometry["id"]),
        analysis_scope="test_scope_direct", provenance_class="third_party_spatial_dataset",
        country="KE", spatial_type="forest_candidate", name="Correctly Tagged Forest",
    )
    results = spatial_assets(db, country="KE", spatial_type="forest_candidate", limit=100, offset=0)
    assert any(r["name"] == "Correctly Tagged Forest" for r in results)


def test_aoi_missing_metadata_is_found_via_frozen_cohort_fallback(db, store):
    """Reproduces the real Kenya situation directly: an AOI promoted with
    ``metadata={"eo_scope": True}`` only (no country/spatial_type,
    matching this codebase's actual bug before it was fixed) must still
    be discoverable once it is a member of a frozen KE cohort.
    """
    world_id, entity, geometry = _make_entity_with_geometry(db, "Legacy Untagged Forest")
    aoi = insert_row(
        db, s.aoi, world_id=world_id, geometry_owner_entity_id=entity["id"], subject_entity_id=entity["id"],
        name="Legacy Untagged Forest", analysis_scope="test_scope_legacy", metadata={"eo_scope": True},
    )
    area_m2 = db.scalar(
        text("SELECT ST_Area(geography(geometry)) FROM geo.geometry_observation WHERE id=:id"),
        {"id": geometry["id"]},
    )
    aoi_version = insert_row(
        db, s.aoi_version, aoi_id=aoi["id"], world_id=world_id, revision=1,
        geometry_observation_id=geometry["id"], geometry_hash="test-hash-legacy",
        source_id=geometry["source_id"], evidence_item_id=geometry["evidence_item_id"],
        normalization_version="test/1", area_m2=area_m2, bounds={"minx": 36.0, "miny": -1.1, "maxx": 36.1, "maxy": -1.0},
    )
    freeze_cohort(
        db, world_id=world_id, country="KE", cohort_key="test-legacy-cohort", definition_version="v1",
        candidates=[
            {
                "source_record_key": "legacy-key",
                "entity_id": str(entity["id"]),
                "aoi_id": str(aoi["id"]),
                "aoi_version_id": str(aoi_version["id"]),
                "geometry_hash": "test-hash-legacy",
            }
        ],
    )

    results = spatial_assets(db, country="KE", spatial_type="forest_candidate", limit=100, offset=0)
    assert any(r["name"] == "Legacy Untagged Forest" for r in results)


def test_wrong_country_cohort_does_not_leak_into_results(db, store):
    world_id, entity, geometry = _make_entity_with_geometry(db, "Untagged Uganda Forest")
    aoi = insert_row(
        db, s.aoi, world_id=world_id, geometry_owner_entity_id=entity["id"], subject_entity_id=entity["id"],
        name="Untagged Uganda Forest", analysis_scope="test_scope_ug_legacy", metadata={"eo_scope": True},
    )
    area_m2 = db.scalar(
        text("SELECT ST_Area(geography(geometry)) FROM geo.geometry_observation WHERE id=:id"),
        {"id": geometry["id"]},
    )
    aoi_version = insert_row(
        db, s.aoi_version, aoi_id=aoi["id"], world_id=world_id, revision=1,
        geometry_observation_id=geometry["id"], geometry_hash="test-hash-ug",
        source_id=geometry["source_id"], evidence_item_id=geometry["evidence_item_id"],
        normalization_version="test/1", area_m2=area_m2, bounds={"minx": 36.0, "miny": -1.1, "maxx": 36.1, "maxy": -1.0},
    )
    freeze_cohort(
        db, world_id=world_id, country="UG", cohort_key="test-ug-legacy-cohort", definition_version="v1",
        candidates=[
            {
                "source_record_key": "ug-legacy-key",
                "entity_id": str(entity["id"]),
                "aoi_id": str(aoi["id"]),
                "aoi_version_id": str(aoi_version["id"]),
                "geometry_hash": "test-hash-ug",
            }
        ],
    )

    results = spatial_assets(db, country="KE", spatial_type="forest_candidate", limit=100, offset=0)
    assert not any(r["name"] == "Untagged Uganda Forest" for r in results)
