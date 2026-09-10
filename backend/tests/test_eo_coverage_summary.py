"""Map-scale multi-sensor coverage summary (backend/app/api/eo.py,
frontend Section 5): one row per real frozen-cohort member with real
per-lane completed-month counts -- a lane with zero real jobs must still
appear with completed_months=0, never be silently absent, and the same
query must work unmodified for a different country's cohort.
"""

from datetime import UTC, datetime

import pytest
from sqlalchemy import select

from app.api.eo import coverage_summary
from app.db import schema as s
from app.services.eo.cohort import freeze_cohort, load_cohort
from app.services.eo.fake_provider import FakeEOProvider
from app.services.eo.provider import SourceItem
from app.services.eo.worker import enqueue, run_job
from app.services.ingestion.cfr_geometry import ingest_cfr_polygons

pytestmark = pytest.mark.integration

COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"
RECIPE = "s2-sr-optical-v1"
QA_PROFILE = "s2-qa-scl-core/1"


def _sample_items(window_start, count=2):
    return tuple(
        SourceItem(
            provider_key="fake", collection_key=COLLECTION, item_id=f"ITEM_{window_start.isoformat()}_{i}",
            sensing_start=window_start, sensing_end=None, platform="Sentinel-2A",
            processing_baseline="05.11", properties={},
        )
        for i in range(count)
    )


def _run_month(db, store, aoi_version_id, year, month):
    window_start = datetime(year, month, 1, tzinfo=UTC)
    window_end = datetime(year, month + 1, 1, tzinfo=UTC) if month < 12 else datetime(year + 1, 1, 1, tzinfo=UTC)
    job = enqueue(
        db, aoi_version_id=aoi_version_id, window_start=window_start, window_end=window_end,
        provider_key="google_earth_engine", collection_key=COLLECTION, recipe_key=RECIPE,
        recipe_version="1", qa_profile_key=QA_PROFILE, qa_profile_version="1", statistics_profile="moments-v1",
    )
    run_job(db, FakeEOProvider(items=_sample_items(window_start), feature_values={"ndvi": (0.5, 0.01)}), job["id"], store=store)


def test_coverage_summary_reports_real_completed_months_and_zero_for_untouched_lanes(db, store):
    report = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]
    aoi_version_id = report["aoi_version_id"]
    entity_id = report["entity_id"]
    world_id = db.scalar(select(s.aoi_version.c.world_id).where(s.aoi_version.c.id == aoi_version_id))

    freeze_cohort(
        db, world_id=str(world_id), country="UG", cohort_key="test-coverage-cohort", definition_version="v1",
        candidates=[
            {
                "source_record_key": "Adjumani",
                "entity_id": str(entity_id),
                "aoi_id": str(report["aoi_id"]),
                "aoi_version_id": str(aoi_version_id),
                "geometry_hash": report.get("geometry_hash", "n/a"),
            }
        ],
    )
    _run_month(db, store, aoi_version_id, 2026, 8)
    _run_month(db, store, aoi_version_id, 2026, 9)

    results = coverage_summary(db, country="UG", target_months=12)
    entry = next(r for r in results if r["entity_id"] == str(entity_id))

    assert entry["name"] == "Adjumani"
    assert entry["aoi_version_id"] == str(aoi_version_id)
    assert entry["lanes"]["s2_optical"]["completed_months"] == 2
    assert entry["lanes"]["s2_optical"]["target_months"] == 12
    assert entry["lanes"]["s2_optical"]["latest_observation_month"] == "2026-09"
    assert entry["lanes"]["s2_optical"]["latest_outcome"] == "success"
    # Real zero, not a missing key -- S1 was never run for this AOI.
    assert entry["lanes"]["s1_ascending"]["completed_months"] == 0
    assert entry["lanes"]["s1_ascending"]["latest_observation_month"] is None
    assert entry["lanes"]["s1_descending"]["completed_months"] == 0


def test_coverage_summary_is_scoped_by_country_with_no_country_specific_code(db, store):
    report = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]
    aoi_version_id = report["aoi_version_id"]
    world_id = db.scalar(select(s.aoi_version.c.world_id).where(s.aoi_version.c.id == aoi_version_id))
    freeze_cohort(
        db, world_id=str(world_id), country="KE", cohort_key="test-ke-coverage-cohort", definition_version="v1",
        candidates=[
            {
                "source_record_key": "Adjumani-as-KE",
                "entity_id": str(report["entity_id"]),
                "aoi_id": str(report["aoi_id"]),
                "aoi_version_id": str(aoi_version_id),
                "geometry_hash": "n/a",
            }
        ],
    )
    _run_month(db, store, aoi_version_id, 2026, 8)

    ug_results = coverage_summary(db, country="UG", target_months=12)
    ke_results = coverage_summary(db, country="KE", target_months=12)

    # Present under KE (frozen there), absent under UG for THIS cohort_key,
    # since UG's own cohort was never frozen in this test.
    assert any(r["country"] == "KE" for r in ke_results)
    assert all(r["country"] == "UG" for r in ug_results)


def test_load_cohort_and_coverage_summary_agree_on_aoi_version(db, store):
    report = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]
    aoi_version_id = report["aoi_version_id"]
    world_id = db.scalar(select(s.aoi_version.c.world_id).where(s.aoi_version.c.id == aoi_version_id))
    freeze_cohort(
        db, world_id=str(world_id), country="UG", cohort_key="test-consistency-cohort", definition_version="v1",
        candidates=[
            {
                "source_record_key": "Adjumani",
                "entity_id": str(report["entity_id"]),
                "aoi_id": str(report["aoi_id"]),
                "aoi_version_id": str(aoi_version_id),
                "geometry_hash": "n/a",
            }
        ],
    )
    loaded = load_cohort(db, country="UG", cohort_key="test-consistency-cohort", definition_version="v1")
    results = coverage_summary(db, country="UG", target_months=12)
    entry = next(r for r in results if r["aoi_version_id"] == loaded["Adjumani"])
    assert entry["name"] == "Adjumani"
