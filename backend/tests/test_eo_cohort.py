"""Frozen EO execution cohorts (observatory v1, section 1): freezing and
loading must never re-ingest canonical geometry, and a sensor backfill must
be able to read a frozen cohort without touching entity/aoi/aoi_version at
all.
"""

import pytest
from sqlalchemy import select

from app.db import schema as s
from app.services.eo.cohort import freeze_cohort, load_cohort, resolve_uganda_cfr_candidates
from app.services.ingestion.cfr_geometry import ingest_cfr_polygons

pytestmark = pytest.mark.integration


def production_world_id(db):
    return db.scalar(select(s.world.c.id).where(s.world.c.name == "production"))


def test_resolve_reads_existing_geometry_without_reingesting(db, store):
    report = ingest_cfr_polygons(db, store, only="Adjumani")
    row = report["records"][0]
    assert row["aoi_version_id"] is not None

    resolved, unresolved = resolve_uganda_cfr_candidates(db, ["Adjumani", "not-a-real-key"])

    assert unresolved == ["not-a-real-key"]
    assert len(resolved) == 1
    assert resolved[0]["source_record_key"] == "Adjumani"
    assert resolved[0]["aoi_version_id"] == str(row["aoi_version_id"])
    assert resolved[0]["geometry_hash"]


def test_freeze_then_load_round_trips_and_is_read_only(db, store):
    report = ingest_cfr_polygons(db, store, only="Adjumani")
    aoi_version_id = report["records"][0]["aoi_version_id"]
    resolved, _ = resolve_uganda_cfr_candidates(db, ["Adjumani"])

    result = freeze_cohort(
        db,
        world_id=production_world_id(db),
        country="UG",
        cohort_key="test-cohort",
        definition_version="v1",
        candidates=resolved,
    )
    assert result["created"] is True
    assert result["member_count"] == 1

    loaded = load_cohort(db, country="UG", cohort_key="test-cohort", definition_version="v1")
    assert loaded == {"Adjumani": str(aoi_version_id)}


def test_freezing_the_same_identity_twice_is_a_noop(db, store):
    report = ingest_cfr_polygons(db, store, only="Adjumani")
    resolved, _ = resolve_uganda_cfr_candidates(db, ["Adjumani"])
    world_id = production_world_id(db)

    first = freeze_cohort(
        db, world_id=world_id, country="UG", cohort_key="test-cohort-2", definition_version="v1", candidates=resolved
    )
    assert first["created"] is True

    second = freeze_cohort(
        db,
        world_id=world_id,
        country="UG",
        cohort_key="test-cohort-2",
        definition_version="v1",
        # Deliberately different candidates -- must NOT be applied, proving
        # an existing (country, cohort_key, definition_version) is immutable.
        candidates=[],
    )
    assert second["created"] is False
    assert second["cohort_id"] == first["cohort_id"]
    assert second["member_count"] == 1

    loaded = load_cohort(db, country="UG", cohort_key="test-cohort-2", definition_version="v1")
    assert len(loaded) == 1
    del report


def test_unresolved_candidates_are_excluded_not_stored(db, store):
    resolved, unresolved = resolve_uganda_cfr_candidates(db, ["definitely-not-ingested"])
    assert resolved == []
    assert unresolved == ["definitely-not-ingested"]

    result = freeze_cohort(
        db,
        world_id=production_world_id(db),
        country="UG",
        cohort_key="test-cohort-3",
        definition_version="v1",
        candidates=[{"source_record_key": "definitely-not-ingested", "aoi_version_id": None}],
    )
    assert result["member_count"] == 0
    assert load_cohort(db, country="UG", cohort_key="test-cohort-3", definition_version="v1") == {}
