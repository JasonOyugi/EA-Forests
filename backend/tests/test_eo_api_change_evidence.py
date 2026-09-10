"""Observatory v0.2 change-evidence read model (backend/app/api/eo.py):
called directly as a function (bypassing HTTP/auth plumbing, consistent
with this codebase's other domain-logic tests) -- what matters here is
that real change candidates and corroboration come back with their
evidence grade, confounders, and sensor-family counts intact, never
collapsed into an opaque score.
"""

from datetime import UTC, datetime

import pytest
from sqlalchemy import select

from app.api.eo import change_evidence
from app.db import schema as s
from app.services.eo.change_domain import create_change_candidate, create_cross_sensor_corroboration
from app.services.eo.evidence_quality import EvidenceQualityInputs, grade_evidence
from app.services.eo.fake_provider import FakeEOProvider
from app.services.eo.provider import SourceItem
from app.services.eo.worker import enqueue, run_job
from app.services.ingestion.cfr_geometry import ingest_cfr_polygons
from app.services.state.registry import audit_context

pytestmark = pytest.mark.integration

COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"
RECIPE = "s2-sr-optical-v1"
QA_PROFILE = "s2-qa-scl-core/1"


def _entity_and_world(db, aoi_version_id):
    row = db.execute(
        select(s.aoi_version.c.world_id, s.aoi.c.geometry_owner_entity_id)
        .select_from(s.aoi_version.join(s.aoi, s.aoi_version.c.aoi_id == s.aoi.c.id))
        .where(s.aoi_version.c.id == aoi_version_id)
    ).one()
    return str(row.geometry_owner_entity_id), str(row.world_id)


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
            provider_key="fake", collection_key=COLLECTION, item_id=f"ITEM_{window_start.isoformat()}",
            sensing_start=window_start, sensing_end=None, platform="Sentinel-2A",
            processing_baseline="05.11", properties={},
        )
        for _ in range(2)
    )
    result = run_job(db, FakeEOProvider(items=items, feature_values={"ndvi": (0.5, 0.01)}), job["id"], store=store)
    return result["eo_observation_id"]


def test_change_evidence_exposes_grade_and_confounders_without_collapsing_them(db, store):
    aoi_version_id = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]["aoi_version_id"]
    entity_id, world_id = _entity_and_world(db, aoi_version_id)
    baseline_obs = _real_observation(
        db, store, aoi_version_id, datetime(2026, 8, 1, tzinfo=UTC), datetime(2026, 9, 1, tzinfo=UTC)
    )
    candidate_obs = _real_observation(
        db, store, aoi_version_id, datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)
    )
    evidence = grade_evidence(
        EvidenceQualityInputs(baseline_acquisition_count=1, candidate_acquisition_count=1, persistence=None)
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
        statistic=5.0,
        baseline_observation_ids=[baseline_obs],
        candidate_observation_ids=[candidate_obs],
        metadata={"evidence_quality": evidence, "confounders": {"note": "test confounder"}},
    )
    corroboration = create_cross_sensor_corroboration(
        db,
        entity_id=entity_id,
        aoi_version_id=aoi_version_id,
        world_id=world_id,
        reference_window=(datetime(2026, 9, 1, tzinfo=UTC), datetime(2026, 10, 1, tzinfo=UTC)),
        members=[{"change_candidate_id": candidate["id"], "sensor_stream": "s2_optical"}],
    )

    result = change_evidence(db, aoi_version_id)

    assert result["aoi_version_id"] == str(aoi_version_id)
    assert len(result["candidates"]) == 1
    returned = result["candidates"][0]
    assert returned["evidence_grade"] == "PRELIMINARY"
    assert returned["evidence_quality"]["reasons"]
    assert returned["confounders"] == {"note": "test confounder"}
    assert returned["interpretation_class"] == "OBSERVATION_CHANGE"

    assert len(result["corroborations"]) == 1
    returned_corroboration = result["corroborations"][0]
    assert returned_corroboration["state"] == "SINGLE_STREAM"
    assert returned_corroboration["distinct_sensor_family_count"] == 1
    assert returned_corroboration["member_change_candidate_ids"] == [str(candidate["id"])]
    assert returned_corroboration["id"] == corroboration["id"]


def test_change_evidence_is_empty_for_an_aoi_with_no_candidates(db, store):
    aoi_version_id = ingest_cfr_polygons(db, store, only="Adjumani")["records"][0]["aoi_version_id"]
    result = change_evidence(db, aoi_version_id)
    assert result["candidates"] == []
    assert result["corroborations"] == []


def test_retracted_candidates_are_excluded(db, store):
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
        statistic=5.0,
        baseline_observation_ids=[baseline_obs],
        candidate_observation_ids=[candidate_obs],
    )
    audit_context(db, "test", "retract for test")
    db.execute(s.change_candidate.update().where(s.change_candidate.c.id == candidate["id"]).values(status="retracted"))

    result = change_evidence(db, aoi_version_id)
    assert result["candidates"] == []
