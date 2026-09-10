"""GET /api/canonical/eo/observations must never let a caller mistake one
real sensor stream for another: every observation now carries its real
recipe_key/collection_key/sensor_lane, and a caller can filter to exactly
one lane instead of getting several streams mixed together and guessing
which one is "latest". This is the backend half of the fix for the real
frontend bug where an S1 observation could be labeled "Sentinel-2" simply
because it happened to be the most recent row for an AOI.
"""

from datetime import UTC, datetime

import pytest

from app.api.eo import list_observations
from app.services.eo.ee_provider import COLLECTION_KEY as S2_COLLECTION_KEY
from app.services.eo.ee_provider import S1_COLLECTION_KEY
from app.services.eo.fake_provider import FakeEOProvider
from app.services.eo.provider import SourceItem
from app.services.eo.sar_feature_registry import QA_PROFILE_KEY as S1_QA_PROFILE_KEY
from app.services.eo.sar_feature_registry import RECIPE_KEY_ASCENDING
from app.services.eo.sar_feature_registry import RECIPE_VERSION as S1_RECIPE_VERSION
from app.services.eo.worker import enqueue, run_job
from app.services.ingestion.cfr_geometry import ingest_cfr_polygons

pytestmark = pytest.mark.integration

S2_RECIPE = "s2-sr-optical-v1"
S2_QA_PROFILE = "s2-qa-scl-core/1"


def _run_s2_month(db, store, aoi_version_id, window_start, window_end):
    job = enqueue(
        db, aoi_version_id=aoi_version_id, window_start=window_start, window_end=window_end,
        provider_key="google_earth_engine", collection_key=S2_COLLECTION_KEY, recipe_key=S2_RECIPE,
        recipe_version="1", qa_profile_key=S2_QA_PROFILE, qa_profile_version="1", statistics_profile="moments-v1",
    )
    items = tuple(
        SourceItem(provider_key="fake", collection_key=S2_COLLECTION_KEY, item_id=f"S2_{window_start.isoformat()}",
                   sensing_start=window_start, sensing_end=None, platform="Sentinel-2A", processing_baseline="05.11", properties={})
        for _ in range(2)
    )
    run_job(db, FakeEOProvider(items=items, feature_values={"ndvi": (0.5, 0.01)}), job["id"], store=store)


def _run_s1_month(db, store, aoi_version_id, window_start, window_end):
    job = enqueue(
        db, aoi_version_id=aoi_version_id, window_start=window_start, window_end=window_end,
        provider_key="google_earth_engine", collection_key=S1_COLLECTION_KEY, recipe_key=RECIPE_KEY_ASCENDING,
        recipe_version=S1_RECIPE_VERSION, qa_profile_key=S1_QA_PROFILE_KEY, qa_profile_version=S1_RECIPE_VERSION,
        statistics_profile="moments-v1",
    )
    items = tuple(
        SourceItem(provider_key="fake", collection_key=S1_COLLECTION_KEY, item_id=f"S1_{window_start.isoformat()}",
                   sensing_start=window_start, sensing_end=None, platform="Sentinel-1A", processing_baseline=None,
                   properties={"orbit_pass": "ASCENDING", "relative_orbit": "17", "polarisations": ["VV", "VH"]})
        for _ in range(2)
    )
    run_job(db, FakeEOProvider(items=items, feature_values={"s1_vv": (-10.0, 0.5)}), job["id"], store=store)


def test_mixed_series_observations_carry_real_lane_identity_not_a_guess(db, store):
    aoi_version_id = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]["aoi_version_id"]
    # S1 is the MORE RECENT window -- the real bug picked "observations[0]"
    # (latest by window_start) and called it Sentinel-2 unconditionally.
    _run_s2_month(db, store, aoi_version_id, datetime(2026, 7, 1, tzinfo=UTC), datetime(2026, 8, 1, tzinfo=UTC))
    _run_s1_month(db, store, aoi_version_id, datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 1, tzinfo=UTC))

    all_observations = list_observations(db, aoi_version_id=aoi_version_id, limit=50)
    assert len(all_observations) == 2
    latest = all_observations[0]
    assert latest["sensor_lane"] == "s1_ascending"
    assert latest["recipe_key"] == RECIPE_KEY_ASCENDING
    assert latest["collection_key"] == S1_COLLECTION_KEY

    s2_only = list_observations(db, aoi_version_id=aoi_version_id, sensor_lane="s2_optical", limit=50)
    assert len(s2_only) == 1
    assert s2_only[0]["sensor_lane"] == "s2_optical"
    assert s2_only[0]["recipe_key"] == S2_RECIPE

    s1_only = list_observations(db, aoi_version_id=aoi_version_id, sensor_lane="s1_ascending", limit=50)
    assert len(s1_only) == 1
    assert s1_only[0]["sensor_lane"] == "s1_ascending"
