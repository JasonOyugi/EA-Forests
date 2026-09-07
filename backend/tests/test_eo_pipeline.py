from datetime import UTC, datetime

import pytest
from sqlalchemy import select, update
from sqlalchemy.exc import DBAPIError

from app.db import schema as s
from app.services.eo.fake_provider import FakeEOProvider
from app.services.eo.feature_registry import (
    CORE_FEATURE_KEYS,
    REFLECTANCE_SCALE,
    SCL_REJECTED_CLASSES,
)
from app.services.eo.grid import select_grid, utm_zone_epsg
from app.services.eo.pipeline import build_analysis_request, run_analysis
from app.services.eo.provider import ProviderError, SourceItem
from app.services.eo.stats import (
    ShardStats,
    merge_shard_statistics,
    weighted_mean,
    weighted_population_variance,
)
from app.services.eo.worker import enqueue, run_job
from app.services.ingestion.cfr_geometry import ingest_cfr_polygons

pytestmark = pytest.mark.integration

WINDOW_START = datetime(2026, 7, 1, tzinfo=UTC)
WINDOW_END = datetime(2026, 8, 1, tzinfo=UTC)
QA_PROFILE = "s2-qa-scl-core/1"
RECIPE = "s2-sr-optical-v1"
COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"


def ready_aoi_version(db, store, cfr_name="Adjumani"):
    report = ingest_cfr_polygons(db, store, only=cfr_name)
    return report["records"][0]["aoi_version_id"]


def sample_items(count=3):
    return tuple(
        SourceItem(
            provider_key="fake",
            collection_key=COLLECTION,
            item_id=f"S2_ITEM_{i}",
            sensing_start=datetime(2026, 7, 5 + i * 5, tzinfo=UTC),
            sensing_end=None,
            platform="Sentinel-2A",
            processing_baseline="05.11",
            properties={},
        )
        for i in range(count)
    )


# --- pure-function tests: grid, stats, formulas ---------------------------


def test_utm_zone_covers_uganda_35n_and_36n():
    assert utm_zone_epsg(29.5, 1.0) == 32635
    assert utm_zone_epsg(33.5, 1.0) == 32636


def test_select_grid_flags_cross_zone_bounds():
    within_zone = select_grid({"minx": 31.0, "miny": 1.0, "maxx": 31.2, "maxy": 1.2})
    assert within_zone.crs == "EPSG:32636"
    assert within_zone.cross_zone_fallback is False

    spanning = select_grid({"minx": 29.9, "miny": 1.0, "maxx": 30.1, "maxy": 1.2})
    assert spanning.cross_zone_fallback is True
    assert spanning.crs == "EPSG:3857"


def test_weighted_mean_and_population_variance_match_hand_computation():
    values = [0.2, 0.4, 0.6]
    weights = [1.0, 1.0, 2.0]
    mean = weighted_mean(values, weights)
    assert mean == pytest.approx((0.2 + 0.4 + 1.2) / 4)
    variance = weighted_population_variance(values, weights, mean)
    expected = (1.0 * (0.2 - mean) ** 2 + 1.0 * (0.4 - mean) ** 2 + 2.0 * (0.6 - mean) ** 2) / 4
    assert variance == pytest.approx(expected)


def test_weighted_mean_zero_weight_is_missing_not_zero():
    assert weighted_mean([0.5], [0.0]) is None
    assert weighted_population_variance([0.5], [0.0]) is None


def test_merge_shard_statistics_matches_direct_computation_on_pooled_pixels():
    # Two disjoint shards of the same AOI, each with its own known pixel
    # population; merging their sufficient statistics must equal computing
    # the weighted mean/variance directly over the pooled pixel set (never a
    # naive average of the two shard means/variances, which would ignore
    # unequal shard weight and between-shard dispersion).
    shard_a_values = [0.4, 0.5, 0.6]
    shard_b_values = [0.1, 0.2]
    shard_a = ShardStats(
        mean=weighted_mean(shard_a_values, [1.0] * 3),
        variance=weighted_population_variance(shard_a_values, [1.0] * 3),
        weight=3.0,
    )
    shard_b = ShardStats(
        mean=weighted_mean(shard_b_values, [1.0] * 2),
        variance=weighted_population_variance(shard_b_values, [1.0] * 2),
        weight=2.0,
    )
    merged_mean, merged_variance, merged_weight = merge_shard_statistics([shard_a, shard_b])

    pooled_values = shard_a_values + shard_b_values
    pooled_weights = [1.0] * len(pooled_values)
    direct_mean = weighted_mean(pooled_values, pooled_weights)
    direct_variance = weighted_population_variance(pooled_values, pooled_weights, direct_mean)

    assert merged_weight == pytest.approx(5.0)
    assert merged_mean == pytest.approx(direct_mean)
    assert merged_variance == pytest.approx(direct_variance)


def test_merge_shard_statistics_ignores_empty_shards():
    empty = ShardStats(mean=0.0, variance=0.0, weight=0.0)
    real = ShardStats(mean=0.5, variance=0.02, weight=10.0)
    mean, variance, weight = merge_shard_statistics([empty, real])
    assert mean == pytest.approx(0.5)
    assert variance == pytest.approx(0.02)
    assert weight == pytest.approx(10.0)
    assert merge_shard_statistics([empty]) is None


def test_reflectance_scale_and_scl_rejection_set():
    assert REFLECTANCE_SCALE == 0.0001
    # No-data, saturated/defective, dark/cloud-shadow, unclassified, cloud
    # (medium+high), cirrus, snow/ice -- SCL 4/5/6 (vegetation, bare, water)
    # must stay usable.
    assert set(SCL_REJECTED_CLASSES) == {0, 1, 2, 3, 7, 8, 9, 10, 11}
    assert set(CORE_FEATURE_KEYS) == {"ndvi", "ndmi", "nbr"}


# --- request identity -------------------------------------------------------


def test_request_identity_is_deterministic_and_period_sensitive(db, store):
    aoi_version_id = ready_aoi_version(db, store)
    kwargs = {
        "aoi_version_id": aoi_version_id,
        "provider_key": "google_earth_engine",
        "collection_key": COLLECTION,
        "recipe_key": RECIPE,
        "recipe_version": "1",
        "qa_profile_key": QA_PROFILE,
        "qa_profile_version": "1",
        "statistics_profile": "moments-v1",
    }
    a = build_analysis_request(db, window_start=WINDOW_START, window_end=WINDOW_END, **kwargs)
    b = build_analysis_request(db, window_start=WINDOW_START, window_end=WINDOW_END, **kwargs)
    assert a.request_hash() == b.request_hash()
    assert a.geometry_hash and a.grid_crs

    other_period = build_analysis_request(
        db,
        window_start=datetime(2026, 8, 1, tzinfo=UTC),
        window_end=datetime(2026, 9, 1, tzinfo=UTC),
        **kwargs,
    )
    assert other_period.request_hash() != a.request_hash()


# --- pipeline outcomes with the fake provider ------------------------------


def test_success_outcome_persists_full_lineage_and_features(db, store):
    aoi_version_id = ready_aoi_version(db, store)
    request = build_analysis_request(
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
    provider = FakeEOProvider(items=sample_items(3), feature_values={"ndvi": (0.62, 0.004)})
    result = run_analysis(db, provider, request, store=store)
    assert result["outcome"] == "success"
    assert result["acquisition_count"] == 3

    run_row = db.execute(select(s.processing_run).where(s.processing_run.c.id == result["processing_run_id"])).mappings().one()
    assert run_row["outcome"] == "success"
    inputs = db.execute(select(s.processing_input).where(s.processing_input.c.processing_run_id == run_row["id"])).mappings().all()
    kinds = {row["input_kind"] for row in inputs}
    assert kinds == {"aoi_version", "source_item"}
    assert sum(1 for row in inputs if row["input_kind"] == "source_item") == 3

    observation = db.execute(select(s.eo_observation).where(s.eo_observation.c.id == result["eo_observation_id"])).mappings().one()
    assert observation["acquisition_count"] == 3
    assert observation["applied_qa_profile"] == QA_PROFILE

    feature_values = db.execute(
        select(s.eo_feature_value).where(s.eo_feature_value.c.eo_feature_set_id == select(
            s.eo_feature_set.c.id
        ).where(s.eo_feature_set.c.eo_observation_id == observation["id"]).scalar_subquery())
    ).mappings().all()
    assert {row["feature_key"] for row in feature_values} == {"ndvi", "ndmi", "nbr"}
    ndvi = next(row for row in feature_values if row["feature_key"] == "ndvi")
    assert float(ndvi["value"]) == pytest.approx(0.62)
    assert -1 <= float(ndvi["value"]) <= 1


def test_no_observation_outcome_when_discovery_finds_nothing(db, store):
    aoi_version_id = ready_aoi_version(db, store)
    request = build_analysis_request(
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
    provider = FakeEOProvider(items=())
    result = run_analysis(db, provider, request, store=store)
    assert result["outcome"] == "no_observation"
    assert result["eo_feature_set_id"] is None
    observation = db.execute(select(s.eo_observation).where(s.eo_observation.c.id == result["eo_observation_id"])).mappings().one()
    assert observation["acquisition_count"] == 0
    # A missing/no-observation month is null support, never a fabricated zero index.
    assert (
        db.scalar(select(s.eo_feature_set.c.id).where(s.eo_feature_set.c.eo_observation_id == observation["id"]))
        is None
    )


def test_partial_outcome_is_retained_not_discarded(db, store):
    aoi_version_id = ready_aoi_version(db, store)
    request = build_analysis_request(
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
    provider = FakeEOProvider(items=sample_items(1), outcome="partial", usable_observation_fraction=0.3)
    result = run_analysis(db, provider, request, store=store)
    assert result["outcome"] == "partial"
    observation = db.execute(select(s.eo_observation).where(s.eo_observation.c.id == result["eo_observation_id"])).mappings().one()
    assert observation["outcome"] == "partial"


def test_provider_failure_outcome_via_job_retry_then_fail(db, store):
    aoi_version_id = ready_aoi_version(db, store)
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
    assert job["deduplicated"] is False
    provider = FakeEOProvider(raise_error=ProviderError("PROVIDER_UNAVAILABLE", "boom", retryable=True))
    first = run_job(db, provider, job["id"], store=store)
    assert first["status"] == "retry_wait"
    second = run_job(db, provider, job["id"], store=store)
    assert second["status"] == "retry_wait"
    third = run_job(db, provider, job["id"], store=store)
    assert third["status"] == "failed"
    row = db.execute(select(s.eo_job).where(s.eo_job.c.id == job["id"])).mappings().one()
    assert row["status"] == "failed" and row["attempts"] == 3


def test_job_dedup_on_identical_request(db, store):
    aoi_version_id = ready_aoi_version(db, store)
    kwargs = {
        "aoi_version_id": aoi_version_id,
        "window_start": WINDOW_START,
        "window_end": WINDOW_END,
        "provider_key": "google_earth_engine",
        "collection_key": COLLECTION,
        "recipe_key": RECIPE,
        "recipe_version": "1",
        "qa_profile_key": QA_PROFILE,
        "qa_profile_version": "1",
        "statistics_profile": "moments-v1",
    }
    first = enqueue(db, **kwargs)
    second = enqueue(db, **kwargs)
    assert first["deduplicated"] is False
    assert second["deduplicated"] is True
    assert first["id"] == second["id"]


def test_succeeded_job_can_carry_no_observation_scientific_outcome(db, store):
    aoi_version_id = ready_aoi_version(db, store)
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
    provider = FakeEOProvider(items=())
    result = run_job(db, provider, job["id"], store=store)
    assert result["status"] == "succeeded"
    assert result["outcome"] == "no_observation"
    row = db.execute(select(s.eo_job).where(s.eo_job.c.id == job["id"])).mappings().one()
    assert row["status"] == "succeeded"


# --- immutability and blocking ---------------------------------------------


def test_eo_observation_and_run_are_immutable_after_publication(db, store):
    aoi_version_id = ready_aoi_version(db, store)
    request = build_analysis_request(
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
    provider = FakeEOProvider(items=sample_items(1))
    result = run_analysis(db, provider, request, store=store)
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(
            update(s.eo_observation)
            .where(s.eo_observation.c.id == result["eo_observation_id"])
            .values(acquisition_count=999)
        )
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(
            update(s.processing_run)
            .where(s.processing_run.c.id == result["processing_run_id"])
            .values(outcome="failed")
        )


def test_blocked_cfr_has_no_aoi_version_to_analyze(db, store):
    report = ingest_cfr_polygons(db, store, only="Kabula")
    (record,) = report["records"]
    assert record["eo_scope"] is False
    assert record["aoi_version_id"] is None


def test_eo_exploratory_cfr_is_accepted_for_analysis(db, store):
    aoi_version_id = ready_aoi_version(db, store)
    aoi_version = db.execute(select(s.aoi_version).where(s.aoi_version.c.id == aoi_version_id)).mappings().one()
    assert aoi_version["metadata"]["eo_readiness"] == "EXPLORATORY"
    request = build_analysis_request(
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
    provider = FakeEOProvider(items=sample_items(2))
    result = run_analysis(db, provider, request, store=store)
    assert result["outcome"] == "success"
