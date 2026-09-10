"""Minimal EO operations read-model (observatory v1, section 11): must
reflect real processing.eo_job state, filterable by collection, without
requiring manual SQL against the live database.
"""

from datetime import UTC, datetime

import pytest

from app.services.eo.fake_provider import FakeEOProvider
from app.services.eo.ops_status import backfill_status
from app.services.eo.worker import enqueue, run_job
from app.services.ingestion.cfr_geometry import ingest_cfr_polygons

pytestmark = pytest.mark.integration

WINDOW_START = datetime(2026, 7, 1, tzinfo=UTC)
WINDOW_END = datetime(2026, 8, 1, tzinfo=UTC)
QA_PROFILE = "s2-qa-scl-core/1"
RECIPE = "s2-sr-optical-v1"
COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"


def test_backfill_status_reflects_a_real_succeeded_job(db, store):
    aoi_version_id = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]["aoi_version_id"]
    job = enqueue(
        db,
        aoi_version_id=aoi_version_id,
        window_start=WINDOW_START,
        window_end=WINDOW_END,
        provider_key="google_earth_engine",
        collection_key=COLLECTION,
        recipe_key=RECIPE,
        recipe_version="1",
        qa_profile_key=QA_PROFILE,
        qa_profile_version="1",
        statistics_profile="moments-v1",
    )
    run_job(db, FakeEOProvider(usable_observation_fraction=0.8), job["id"], store=store)

    status = backfill_status(db, collection_key=COLLECTION)
    statuses = {(row["recipe_key"], row["status"]): row["n"] for row in status["by_status"]}
    assert statuses.get((RECIPE, "succeeded"), 0) >= 1

    runtime_rows = {row["recipe_key"]: row for row in status["runtime_seconds"]}
    assert runtime_rows[RECIPE]["succeeded_count"] >= 1
    assert runtime_rows[RECIPE]["p50_seconds"] is not None


def test_backfill_status_filter_excludes_other_collections(db, store):
    status = backfill_status(db, collection_key="NOT_A_REAL_COLLECTION")
    assert status["by_status"] == []
