"""Change-assessment domain (observatory v1, section 4): a change
candidate must carry real observation lineage, never a phantom label, and
the schema itself must refuse a biological interpretation. Cross-sensor
corroboration is a separate object with its own real membership.
"""

from datetime import UTC, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.db import schema as s
from app.services.eo.change_domain import (
    classify_corroboration_state,
    create_change_candidate,
    create_cross_sensor_corroboration,
)
from app.services.eo.fake_provider import FakeEOProvider
from app.services.eo.provider import SourceItem
from app.services.eo.worker import enqueue, run_job
from app.services.ingestion.cfr_geometry import ingest_cfr_polygons
from app.services.state.registry import audit_context, insert_row

pytestmark = pytest.mark.integration

COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"
RECIPE = "s2-sr-optical-v1"
QA_PROFILE = "s2-qa-scl-core/1"


def _real_observation(db, store, aoi_version_id, window_start, window_end):
    job = enqueue(
        db,
        aoi_version_id=aoi_version_id,
        window_start=window_start,
        window_end=window_end,
        provider_key="google_earth_engine",
        collection_key=COLLECTION,
        recipe_key=RECIPE,
        recipe_version="1",
        qa_profile_key=QA_PROFILE,
        qa_profile_version="1",
        statistics_profile="moments-v1",
    )
    items = tuple(
        SourceItem(
            provider_key="fake",
            collection_key=COLLECTION,
            item_id=f"ITEM_{window_start.isoformat()}",
            sensing_start=window_start,
            sensing_end=None,
            platform="Sentinel-2A",
            processing_baseline="05.11",
            properties={},
        )
        for _ in range(2)
    )
    result = run_job(db, FakeEOProvider(items=items, feature_values={"ndvi": (0.5, 0.01)}), job["id"], store=store)
    assert result["status"] == "succeeded"
    return result["eo_observation_id"]


def _entity_and_world(db, aoi_version_id):
    row = db.execute(
        select(s.aoi_version.c.world_id, s.aoi.c.geometry_owner_entity_id)
        .select_from(s.aoi_version.join(s.aoi, s.aoi_version.c.aoi_id == s.aoi.c.id))
        .where(s.aoi_version.c.id == aoi_version_id)
    ).one()
    return str(row.geometry_owner_entity_id), str(row.world_id)


def test_change_candidate_requires_real_lineage_on_both_sides(db, store):
    aoi_version_id = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]["aoi_version_id"]
    entity_id, world_id = _entity_and_world(db, aoi_version_id)
    baseline_obs = _real_observation(
        db, store, aoi_version_id, datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 1, tzinfo=UTC)
    )

    with pytest.raises(ValueError, match="candidate eo_observation_id"):
        create_change_candidate(
            db,
            entity_id=entity_id,
            aoi_version_id=aoi_version_id,
            world_id=world_id,
            sensor_stream="s2_optical",
            features=["ndvi"],
            baseline_window=(datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 1, tzinfo=UTC)),
            candidate_window=(datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)),
            algorithm="robust_first_difference",
            algorithm_version="1",
            config_version="1",
            statistic=5.0,
            baseline_observation_ids=[baseline_obs],
            candidate_observation_ids=[],  # deliberately empty
        )


def test_change_candidate_persists_with_real_observation_lineage(db, store):
    aoi_version_id = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]["aoi_version_id"]
    entity_id, world_id = _entity_and_world(db, aoi_version_id)
    baseline_obs = _real_observation(
        db, store, aoi_version_id, datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 1, tzinfo=UTC)
    )
    candidate_obs = _real_observation(
        db, store, aoi_version_id, datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)
    )

    candidate = create_change_candidate(
        db,
        entity_id=entity_id,
        aoi_version_id=aoi_version_id,
        world_id=world_id,
        sensor_stream="s2_optical",
        features=["ndvi"],
        baseline_window=(datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 1, tzinfo=UTC)),
        candidate_window=(datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)),
        algorithm="robust_first_difference",
        algorithm_version="1",
        config_version="1",
        statistic=5.2,
        persistence=1.0,
        common_support_fraction=0.9,
        baseline_observation_ids=[baseline_obs],
        candidate_observation_ids=[candidate_obs],
    )
    assert candidate["interpretation_class"] == "OBSERVATION_CHANGE"
    assert candidate["status"] == "active"

    links = db.execute(
        select(s.change_candidate_source_observation).where(
            s.change_candidate_source_observation.c.change_candidate_id == candidate["id"]
        )
    ).mappings().all()
    roles = sorted(link["role"] for link in links)
    assert roles == ["baseline", "candidate"]


def test_schema_refuses_a_biological_interpretation_label(db, store):
    aoi_version_id = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]["aoi_version_id"]
    entity_id, world_id = _entity_and_world(db, aoi_version_id)
    with pytest.raises((IntegrityError, DBAPIError)), db.begin_nested():
        audit_context(db, "test", "attempt a forbidden biological label")
        insert_row(
            db,
            s.change_candidate,
            entity_id=entity_id,
            aoi_version_id=aoi_version_id,
            world_id=world_id,
            sensor_stream="s2_optical",
            features=["ndvi"],
            baseline_window_start=datetime(2026, 8, 1, tzinfo=UTC),
            baseline_window_end=datetime(2026, 9, 1, tzinfo=UTC),
            candidate_window_start=datetime(2026, 9, 1, tzinfo=UTC),
            candidate_window_end=datetime(2026, 10, 1, tzinfo=UTC),
            algorithm="robust_first_difference",
            algorithm_version="1",
            config_version="1",
            statistic=5.0,
            interpretation_class="HARVEST",
        )


def test_cross_sensor_corroboration_links_real_candidates(db, store):
    aoi_version_id = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]["aoi_version_id"]
    entity_id, world_id = _entity_and_world(db, aoi_version_id)
    baseline_obs = _real_observation(
        db, store, aoi_version_id, datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 1, tzinfo=UTC)
    )
    candidate_obs = _real_observation(
        db, store, aoi_version_id, datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)
    )
    optical_candidate = create_change_candidate(
        db,
        entity_id=entity_id,
        aoi_version_id=aoi_version_id,
        world_id=world_id,
        sensor_stream="s2_optical",
        features=["ndvi"],
        baseline_window=(datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 1, tzinfo=UTC)),
        candidate_window=(datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)),
        algorithm="robust_first_difference",
        algorithm_version="1",
        config_version="1",
        statistic=5.0,
        baseline_observation_ids=[baseline_obs],
        candidate_observation_ids=[candidate_obs],
    )

    corroboration = create_cross_sensor_corroboration(
        db,
        entity_id=entity_id,
        aoi_version_id=aoi_version_id,
        world_id=world_id,
        reference_window=(datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)),
        members=[{"change_candidate_id": optical_candidate["id"], "sensor_stream": "s2_optical"}],
    )
    # One stream contributed -> SINGLE_STREAM, derived from the data, not
    # asserted by the caller (this is the whole point of the fix: the
    # state can no longer be requested independently of what actually
    # contributed).
    assert corroboration["state"] == "SINGLE_STREAM"
    assert corroboration["distinct_stream_count"] == 1
    assert corroboration["distinct_sensor_family_count"] == 1


def test_insufficient_evidence_state_does_not_require_members(db, store):
    aoi_version_id = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]["aoi_version_id"]
    entity_id, world_id = _entity_and_world(db, aoi_version_id)
    corroboration = create_cross_sensor_corroboration(
        db,
        entity_id=entity_id,
        aoi_version_id=aoi_version_id,
        world_id=world_id,
        reference_window=(datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)),
        members=[],
    )
    assert corroboration["state"] == "INSUFFICIENT_EVIDENCE"


def test_two_s1_streams_are_within_sensor_not_cross_sensor():
    """The real bug this migration fixes: S1 ascending + S1 descending are
    two streams of ONE sensor family (Sentinel-1 C-band SAR), not two
    sensors -- they must never classify as CROSS_SENSOR_SUPPORTED or
    CROSS_MODALITY_SUPPORTED.
    """
    state, counts = classify_corroboration_state(
        ["s1_ascending", "s1_descending"], temporally_compatible=True
    )
    assert state == "WITHIN_SENSOR_MULTI_STREAM_SUPPORTED"
    assert counts["distinct_stream_count"] == 2
    assert counts["distinct_sensor_family_count"] == 1
    assert counts["distinct_modality_count"] == 1


def test_s1_and_s2_together_are_cross_sensor_and_cross_modality():
    state, counts = classify_corroboration_state(["s1_ascending", "s2_optical"], temporally_compatible=True)
    assert state == "CROSS_MODALITY_SUPPORTED"
    assert counts["distinct_sensor_family_count"] == 2
    assert counts["distinct_modality_count"] == 2


def test_single_stream_regardless_of_candidate_count():
    state, counts = classify_corroboration_state(["s2_optical"], temporally_compatible=True)
    assert state == "SINGLE_STREAM"
    assert counts["distinct_stream_count"] == 1


def test_temporally_incompatible_multi_stream_is_disagreement():
    state, _ = classify_corroboration_state(["s1_ascending", "s2_optical"], temporally_compatible=False)
    assert state == "SENSOR_DISAGREEMENT"


def test_no_streams_is_insufficient_evidence():
    state, counts = classify_corroboration_state([], temporally_compatible=True)
    assert state == "INSUFFICIENT_EVIDENCE"
    assert counts["distinct_stream_count"] == 0


def test_insufficient_common_support_overrides_stream_composition(db, store):
    """Even a real cross-sensor stream combination must not be classified
    as supported evidence if the caller flags inadequate common support --
    a distinct failure mode from stream composition.
    """
    aoi_version_id = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]["aoi_version_id"]
    entity_id, world_id = _entity_and_world(db, aoi_version_id)
    baseline_obs = _real_observation(
        db, store, aoi_version_id, datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 1, tzinfo=UTC)
    )
    candidate_obs = _real_observation(
        db, store, aoi_version_id, datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)
    )
    optical_candidate = create_change_candidate(
        db,
        entity_id=entity_id,
        aoi_version_id=aoi_version_id,
        world_id=world_id,
        sensor_stream="s2_optical",
        features=["ndvi"],
        baseline_window=(datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 1, tzinfo=UTC)),
        candidate_window=(datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)),
        algorithm="robust_first_difference",
        algorithm_version="1",
        config_version="1",
        statistic=5.0,
        baseline_observation_ids=[baseline_obs],
        candidate_observation_ids=[candidate_obs],
    )
    corroboration = create_cross_sensor_corroboration(
        db,
        entity_id=entity_id,
        aoi_version_id=aoi_version_id,
        world_id=world_id,
        reference_window=(datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)),
        members=[{"change_candidate_id": optical_candidate["id"], "sensor_stream": "s2_optical"}],
        common_support_ok=False,
    )
    assert corroboration["state"] == "INSUFFICIENT_COMMON_SUPPORT"


def test_baseline_window_must_not_overlap_candidate_window(db, store):
    aoi_version_id = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]["aoi_version_id"]
    entity_id, world_id = _entity_and_world(db, aoi_version_id)
    baseline_obs = _real_observation(
        db, store, aoi_version_id, datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 15, tzinfo=UTC)
    )
    candidate_obs = _real_observation(
        db, store, aoi_version_id, datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)
    )
    with pytest.raises((IntegrityError, DBAPIError)), db.begin_nested():
        create_change_candidate(
            db,
            entity_id=entity_id,
            aoi_version_id=aoi_version_id,
            world_id=world_id,
            sensor_stream="s2_optical",
            features=["ndvi"],
            baseline_window=(datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 15, tzinfo=UTC)),
            candidate_window=(datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)),
            algorithm="robust_first_difference",
            algorithm_version="1",
            config_version="1",
            statistic=5.0,
            baseline_observation_ids=[baseline_obs],
            candidate_observation_ids=[candidate_obs],
        )
