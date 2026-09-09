"""Multi-sensor availability matrix (observatory v1, section 4): a cell
must report real job/observation bookkeeping, a missing month must stay
missing (never backfilled with a fake zero), and per-lane completeness must
never collapse into one combined number.
"""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.db import schema as s
from app.services.eo.availability_matrix import build_availability_matrix, completeness_by_lane
from app.services.eo.cohort import freeze_cohort, load_cohort, resolve_uganda_cfr_candidates
from app.services.eo.fake_provider import FakeEOProvider
from app.services.eo.provider import SourceItem
from app.services.eo.worker import enqueue, run_job
from app.services.ingestion.cfr_geometry import ingest_cfr_polygons

pytestmark = pytest.mark.integration

SEPT_START, SEPT_END = datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)
OCT_START, OCT_END = datetime(2026, 10, 1, tzinfo=UTC), datetime(2026, 11, 1, tzinfo=UTC)
QA_PROFILE = "s2-qa-scl-core/1"
RECIPE = "s2-sr-optical-v1"
COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"


def _sample_items(count=3):
    return tuple(
        SourceItem(
            provider_key="fake",
            collection_key=COLLECTION,
            item_id=f"S2_ITEM_{i}",
            sensing_start=SEPT_START + timedelta(days=i),
            sensing_end=None,
            platform="Sentinel-2A",
            processing_baseline="05.11",
            properties={},
        )
        for i in range(count)
    )


def _cohort_members(db, store):
    ingest_cfr_polygons(db, store, only="Adjumani")
    resolved, _ = resolve_uganda_cfr_candidates(db, ["Adjumani"])
    world_id = db.scalar(select(s.world.c.id).where(s.world.c.name == "production"))
    freeze_cohort(
        db, world_id=world_id, country="UG", cohort_key="matrix-test", definition_version="v1", candidates=resolved
    )
    return load_cohort(db, country="UG", cohort_key="matrix-test", definition_version="v1")


def test_matrix_reports_a_real_succeeded_cell_and_leaves_other_months_absent(db, store):
    members = _cohort_members(db, store)
    aoi_version_id = members["Adjumani"]

    job = enqueue(
        db,
        aoi_version_id=aoi_version_id,
        window_start=SEPT_START,
        window_end=SEPT_END,
        provider_key="google_earth_engine",
        collection_key=COLLECTION,
        recipe_key=RECIPE,
        recipe_version="1",
        qa_profile_key=QA_PROFILE,
        qa_profile_version="1",
        statistics_profile="moments-v1",
    )
    provider = FakeEOProvider(items=_sample_items(3), feature_values={"ndvi": (0.62, 0.004)})
    result = run_job(db, provider, job["id"], store=store)
    assert result["status"] == "succeeded"

    matrix = build_availability_matrix(db, members)
    cell = matrix["Adjumani"]["2026-09"]["s2_optical"]
    assert cell["job_status"] == "succeeded"
    assert cell["outcome"] == "success"
    assert cell["acquisition_count"] == 3
    assert cell["usable_observation_fraction"] is not None
    assert cell["recipe_key"] == RECIPE

    # October was never submitted -- must not appear as a fabricated zero.
    assert "2026-10" not in matrix["Adjumani"]


def test_completeness_by_lane_counts_only_succeeded_months_per_lane(db, store):
    members = _cohort_members(db, store)
    aoi_version_id = members["Adjumani"]

    job = enqueue(
        db,
        aoi_version_id=aoi_version_id,
        window_start=SEPT_START,
        window_end=SEPT_END,
        provider_key="google_earth_engine",
        collection_key=COLLECTION,
        recipe_key=RECIPE,
        recipe_version="1",
        qa_profile_key=QA_PROFILE,
        qa_profile_version="1",
        statistics_profile="moments-v1",
    )
    run_job(db, FakeEOProvider(items=_sample_items(3), feature_values={"ndvi": (0.62, 0.004)}), job["id"], store=store)

    matrix = build_availability_matrix(db, members)
    summary = completeness_by_lane(matrix, months=["2026-09", "2026-10"])
    assert summary["Adjumani"]["months_intended"] == 2
    assert summary["Adjumani"]["s2_optical_complete"] == 1  # September only
    assert summary["Adjumani"]["s1_ascending_complete"] == 0
    assert summary["Adjumani"]["s1_descending_complete"] == 0
