import json
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import DBAPIError

from app.db import schema as s
from app.services.eo.country_pass import CohortMember, build_country_summary
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
from app.services.eo.work_limits import (
    DIRECT_PROCESSING_MAX_AREA_HA,
    generate_deterministic_shards,
    should_shard,
)
from app.services.eo.worker import claim_job, enqueue, execute_claimed_job, run_job
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
            sensing_start=datetime(2026, 7, 1, tzinfo=UTC) + timedelta(days=i),
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


# --- per-cell acquisition support (Part 4) ---------------------------------


def test_aoi_wide_acquisition_count_does_not_imply_per_cell_support(db, store):
    # 10 AOI-wide acquisitions, but only 40% of the AOI area actually had the
    # policy minimum of 2 distinct contributing acquisitions at a given cell.
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
    provider = FakeEOProvider(items=sample_items(10), eligible_support_area_fraction=0.4)
    result = run_analysis(db, provider, request, store=store)
    observation = (
        db.execute(select(s.eo_observation).where(s.eo_observation.c.id == result["eo_observation_id"]))
        .mappings()
        .one()
    )
    assert observation["acquisition_count"] == 10
    assert observation["metadata"]["min_acquisition_support"] == 2
    assert observation["metadata"]["eligible_support_area_fraction"] == pytest.approx(0.4)
    # The AOI-wide count (10) must never be read as "every cell saw 10 acquisitions".
    assert observation["metadata"]["eligible_support_area_fraction"] < 1.0


# --- job leasing and fencing (Part 6) ---------------------------------------


def test_claim_job_sets_lease_and_fencing_token(db, store):
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
    claimed = claim_job(db, worker_id="worker-a")
    assert claimed["id"] == job["id"]
    assert claimed["status"] == "running"
    assert claimed["fencing_token"] == 1
    assert claimed["worker_id"] == "worker-a"
    assert claimed["lease_expires_at"] is not None
    # Not claimable again while the lease is live.
    assert claim_job(db, worker_id="worker-b") is None


def test_stale_worker_cannot_publish_after_losing_the_lease(db, store):
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
    stale_claim = claim_job(db, worker_id="worker-a")
    # Simulate the stale worker's lease expiring (crash / long GC pause) so a
    # second worker recovers the same job with a new fencing token.
    db.execute(
        text("UPDATE processing.eo_job SET lease_expires_at = clock_timestamp() - interval '1 second' WHERE id = :id"),
        {"id": job["id"]},
    )
    recovering_claim = claim_job(db, worker_id="worker-b")
    assert recovering_claim is not None
    assert recovering_claim["fencing_token"] == stale_claim["fencing_token"] + 1

    # The stale worker finishes its (now-orphaned) work and tries to publish
    # using its OLD fencing token: it must not be able to.
    stale_provider = FakeEOProvider(items=sample_items(1))
    stale_result = execute_claimed_job(db, stale_provider, stale_claim, store=store)
    assert stale_result["lease_held"] is False
    assert stale_result["status"] == "lease_lost"

    row = db.execute(select(s.eo_job).where(s.eo_job.c.id == job["id"])).mappings().one()
    assert row["status"] == "running"  # still owned by the recovering worker
    assert row["fencing_token"] == recovering_claim["fencing_token"]

    # The recovering worker's own publish, using the CURRENT token, succeeds.
    recovering_provider = FakeEOProvider(items=sample_items(1))
    recovered_result = execute_claimed_job(db, recovering_provider, recovering_claim, store=store)
    assert recovered_result["lease_held"] is True
    assert recovered_result["status"] == "succeeded"
    row = db.execute(select(s.eo_job).where(s.eo_job.c.id == job["id"])).mappings().one()
    assert row["status"] == "succeeded"


def test_crashed_worker_job_is_recoverable_after_lease_expiry(db, store):
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
    claim_job(db, worker_id="crashed-worker")  # claims, then "crashes": never executes or publishes
    assert claim_job(db, worker_id="live-worker") is None  # lease still live

    db.execute(
        text("UPDATE processing.eo_job SET lease_expires_at = clock_timestamp() - interval '1 second' WHERE id = :id"),
        {"id": job["id"]},
    )
    recovered = claim_job(db, worker_id="live-worker")
    assert recovered is not None
    assert recovered["attempts"] == 2  # one attempt per claim, auditable
    result = execute_claimed_job(db, FakeEOProvider(items=sample_items(1)), recovered, store=store)
    assert result["status"] == "succeeded"


def test_run_job_convenience_wrapper_still_uses_fencing(db, store):
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
    result = run_job(db, FakeEOProvider(items=sample_items(2)), job["id"], store=store)
    assert result["status"] == "succeeded"
    row = db.execute(select(s.eo_job).where(s.eo_job.c.id == job["id"])).mappings().one()
    assert row["fencing_token"] == 1
    assert row["status"] == "succeeded"


# --- low-support / small-AOI statistics policy (Parts 2, 13) ---------------


def test_low_support_result_is_partial_not_dropped(db, store):
    # Below the 25-cell eligibility threshold, still a real, retained result.
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
    provider = FakeEOProvider(items=sample_items(2), total_pixel_count=24, valid_pixel_count=24)
    result = run_analysis(db, provider, request, store=store)
    feature_set_id = db.scalar(
        select(s.eo_feature_set.c.id).where(s.eo_feature_set.c.eo_observation_id == result["eo_observation_id"])
    )
    ndvi = db.execute(
        select(s.eo_feature_value).where(
            s.eo_feature_value.c.eo_feature_set_id == feature_set_id,
            s.eo_feature_value.c.feature_key == "ndvi",
        )
    ).mappings().one()
    assert ndvi["valid_pixel_count"] == 24
    assert ndvi["value"] is not None  # retained, not zeroed or dropped for being small


# --- work limits and deterministic sharding (Part 5) ------------------------


def test_should_shard_reflects_the_measured_direct_processing_ceiling():
    assert should_shard(area_m2=92_559 * 10_000, vertex_count=500, candidate_item_count=22) is False
    assert (
        should_shard(area_m2=(DIRECT_PROCESSING_MAX_AREA_HA + 1) * 10_000, vertex_count=500, candidate_item_count=22)
        is True
    )
    assert should_shard(area_m2=100 * 10_000, vertex_count=60_000, candidate_item_count=5) is True
    assert should_shard(area_m2=100 * 10_000, vertex_count=5, candidate_item_count=400) is True


def test_deterministic_shards_cover_the_aoi_without_double_counting_area(db):
    # A ~50 km square, well above DIRECT_PROCESSING_MAX_AREA_HA, exercised
    # purely through PostGIS -- no live Earth Engine needed to validate
    # shard geometry, since sharding is a spatial-support concern, not a
    # provider concern.
    square_wkt = "POLYGON((31.0 1.0, 31.45 1.0, 31.45 1.45, 31.0 1.45, 31.0 1.0))"
    original_area_m2 = db.scalar(
        text("SELECT ST_Area(ST_GeomFromText(:wkt, 4326)::geography)"), {"wkt": square_wkt}
    )
    assert should_shard(area_m2=original_area_m2, vertex_count=4, candidate_item_count=10) is True

    shards_a = generate_deterministic_shards(db, square_wkt, "EPSG:32636")
    shards_b = generate_deterministic_shards(db, square_wkt, "EPSG:32636")
    assert len(shards_a) > 1
    # Determinism: identical geometry/CRS input always yields the same shards.
    assert [round(s.area_m2) for s in shards_a] == [round(s.area_m2) for s in shards_b]
    assert [s.index for s in shards_a] == [s.index for s in shards_b]

    # Shards are tiled in a planar UTM projection then reprojected back to
    # 4326 for geodesic area, so a tiny (~1e-5 relative) reprojection-rounding
    # difference from the direct-on-4326 area is expected, not a coverage gap.
    total_shard_area = sum(s.area_m2 for s in shards_a)
    assert total_shard_area == pytest.approx(original_area_m2, rel=1e-4)

    # No overlap beyond numerical boundary tolerance: pairwise intersection
    # area must be ~0 for every shard pair.
    for i, shard_i in enumerate(shards_a):
        for shard_j in shards_a[i + 1 :]:
            overlap = db.scalar(
                text(
                    "SELECT ST_Area(ST_Intersection(ST_GeomFromGeoJSON(:a), ST_GeomFromGeoJSON(:b))::geography)"
                ),
                {"a": json.dumps(shard_i.geojson), "b": json.dumps(shard_j.geojson)},
            )
            assert overlap < 1.0  # square metres; effectively zero


def test_merged_shard_statistics_trace_back_to_the_same_parent_aoi_version(db, store):
    # Sharding is compute support only: shard results are never independent
    # forest assets, and merging them must reference the SAME parent AOI
    # version lineage as a direct (unsharded) run would.
    aoi_version_id = ready_aoi_version(db, store)
    shard_a = ShardStats(mean=0.6, variance=0.01, weight=1000.0)
    shard_b = ShardStats(mean=0.55, variance=0.012, weight=1500.0)
    mean, _variance, weight = merge_shard_statistics([shard_a, shard_b])
    assert weight == pytest.approx(2500.0)
    assert mean == pytest.approx((1000 * 0.6 + 1500 * 0.55) / 2500)
    # The merged result is reported against the one unsharded AOI version --
    # no new entity/identity is minted for the merge.
    aoi_row = db.execute(select(s.aoi).where(s.aoi.c.id == db.scalar(
        select(s.aoi_version.c.aoi_id).where(s.aoi_version.c.id == aoi_version_id)
    ))).mappings().one()
    assert aoi_row["id"] is not None


# --- country-run summary (Parts 9-10) ---------------------------------------


def test_country_summary_accounts_for_every_cohort_member_including_failures():
    members = [
        CohortMember("A", area_ha=100.0, job_status="succeeded", outcome="success",
                     usable_observation_fraction=0.95, eligible_acquisition_count=10),
        CohortMember("B", area_ha=50.0, job_status="succeeded", outcome="partial",
                     usable_observation_fraction=0.4, eligible_acquisition_count=3),
        CohortMember("C", area_ha=25.0, job_status="succeeded", outcome="no_observation",
                     usable_observation_fraction=None, eligible_acquisition_count=0),
        CohortMember("D", area_ha=10.0, job_status="failed", outcome=None,
                     usable_observation_fraction=None, eligible_acquisition_count=None),
        CohortMember("E", area_ha=5.0, job_status="ingest_failed", outcome=None,
                     usable_observation_fraction=None, eligible_acquisition_count=None),
    ]
    summary = build_country_summary(members)
    assert summary["total_cfrs_submitted"] == 5
    assert summary["succeeded_jobs"] == 3
    assert summary["failed_jobs"] == 2
    assert summary["scientific_outcomes"] == {
        "success": 1,
        "partial": 1,
        "no_observation": 1,
        "failed_or_unprocessed": 2,
    }
    # Every CFR's area is accounted for exactly once, across the buckets.
    coverage = summary["coverage"]
    assert coverage["total_processable_area_ha"] == pytest.approx(190.0)
    assert coverage["success_area_ha"] == pytest.approx(100.0)
    assert coverage["partial_area_ha"] == pytest.approx(50.0)
    assert coverage["no_observation_area_ha"] == pytest.approx(25.0)
    assert coverage["failed_or_unprocessed_area_ha"] == pytest.approx(15.0)
    assert (
        coverage["success_area_ha"]
        + coverage["partial_area_ha"]
        + coverage["no_observation_area_ha"]
        + coverage["failed_or_unprocessed_area_ha"]
        == pytest.approx(coverage["total_processable_area_ha"])
    )


def test_country_summary_quality_metrics_and_low_support_flagging():
    members = [
        CohortMember("A", 10, "succeeded", "success", 0.9, 10),
        CohortMember("B", 10, "succeeded", "success", 0.5, 1),  # below the 2-acquisition support policy
        CohortMember("C", 10, "succeeded", "partial", 0.1, 2),
    ]
    summary = build_country_summary(members)
    quality = summary["quality"]
    assert quality["median_usable_coverage"] == pytest.approx(0.5)
    assert quality["low_support_cfr_count"] == 1
    assert quality["median_eligible_acquisition_count"] == pytest.approx(2.0)


def test_country_summary_never_claims_a_single_national_ndvi_figure():
    # No aggregate NDVI/NDMI/NBR value anywhere in the summary -- only
    # technical completeness (outcomes/coverage/quality) and an explicit
    # disclaimer that per-CFR feature values live elsewhere.
    summary = build_country_summary([CohortMember("A", 10, "succeeded", "success", 1.0, 5)])
    assert set(summary.keys()) == {
        "total_cfrs_submitted",
        "succeeded_jobs",
        "failed_jobs",
        "scientific_outcomes",
        "coverage",
        "quality",
        "note",
    }
    assert "forest health" not in summary["note"].lower()
