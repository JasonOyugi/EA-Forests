from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import AwareDatetime, BaseModel, ConfigDict
from sqlalchemy import select, text

from app.api.canonical import DB, require_access
from app.db import schema as s
from app.services.eo.ee_provider import COLLECTION_KEY, PROVIDER_KEY, QA_PROFILE_CORE
from app.services.eo.feature_registry import FEATURE_RECIPE_KEY, FEATURE_RECIPE_VERSION
from app.services.eo.pipeline import STATISTICS_PROFILE
from app.services.eo.worker import enqueue

router = APIRouter(
    prefix="/api/canonical/eo", tags=["EO observations"], dependencies=[Depends(require_access)]
)

# Homogeneous-stream identity, never blended (EO observation architecture:
# S1 ascending/descending are separate lanes on purpose). A caller (this
# API, the coverage-summary read model, the frontend) must always be able
# to tell which real sensor lane an observation belongs to -- this is the
# single source of that mapping, shared by every endpoint below so a
# recipe added here is visible everywhere at once.
LANE_BY_RECIPE_KEY = {
    "s2-sr-optical-v1": "s2_optical",
    "s1-grd-backscatter-ascending-v1": "s1_ascending",
    "s1-grd-backscatter-descending-v1": "s1_descending",
}


class Request(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AnalysisCreate(Request):
    aoi_version_id: UUID
    window_start: AwareDatetime
    window_end: AwareDatetime
    provider_key: str = PROVIDER_KEY
    collection_key: str = COLLECTION_KEY
    recipe_key: str = FEATURE_RECIPE_KEY
    recipe_version: str = FEATURE_RECIPE_VERSION
    qa_profile_key: str = QA_PROFILE_CORE
    qa_profile_version: str = "1"
    statistics_profile: str = STATISTICS_PROFILE

    @property
    def half_open_valid(self) -> bool:
        return self.window_start < self.window_end


@router.post("/analyses", status_code=202)
def submit_analysis(payload: AnalysisCreate, db: DB):
    if payload.window_end <= payload.window_start:
        raise HTTPException(422, "window_end must be after window_start ([start,end) half-open)")
    job = enqueue(
        db,
        aoi_version_id=str(payload.aoi_version_id),
        window_start=payload.window_start,
        window_end=payload.window_end,
        provider_key=payload.provider_key,
        collection_key=payload.collection_key,
        recipe_key=payload.recipe_key,
        recipe_version=payload.recipe_version,
        qa_profile_key=payload.qa_profile_key,
        qa_profile_version=payload.qa_profile_version,
        statistics_profile=payload.statistics_profile,
    )
    return {
        "job_id": job["id"],
        "status": job["status"],
        "deduplicated": job["deduplicated"],
        "processing_run_id": job.get("processing_run_id"),
        "eo_observation_id": job.get("eo_observation_id"),
    }


@router.get("/jobs/{job_id}")
def get_job(job_id: UUID, db: DB):
    row = db.execute(select(s.eo_job).where(s.eo_job.c.id == job_id)).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "EO job not found")
    return dict(row)


def _feature_values(db, eo_observation_id):
    feature_set_id = db.scalar(
        select(s.eo_feature_set.c.id).where(s.eo_feature_set.c.eo_observation_id == eo_observation_id)
    )
    if not feature_set_id:
        return []
    rows = db.execute(
        select(s.eo_feature_value).where(s.eo_feature_value.c.eo_feature_set_id == feature_set_id)
    ).mappings()
    return [
        {
            "feature_key": row["feature_key"],
            "feature_version": row["feature_version"],
            "value_statistic": row["value_statistic"],
            "value": float(row["value"]) if row["value"] is not None else None,
            "unit": row["unit"],
            "standard_deviation": (
                float(row["standard_deviation"]) if row["standard_deviation"] is not None else None
            ),
            "valid_pixel_count": row["valid_pixel_count"],
            "total_pixel_count": row["total_pixel_count"],
            "usable_fraction": (
                float(row["usable_fraction"]) if row["usable_fraction"] is not None else None
            ),
            "missingness": row["missingness"],
        }
        for row in rows
    ]


def _observation_summary(row: dict) -> dict:
    """Every observation carries its real series identity (recipe_key,
    collection_key, sensor_lane) -- never left for a caller to assume.
    ``sensor_lane`` is ``None`` for a recipe not yet in LANE_BY_RECIPE_KEY
    (future sensors), which a caller must treat as "unrecognized", not
    silently default to optical.
    """
    return {
        "id": row["id"],
        "series_id": row["series_id"],
        "recipe_key": row["recipe_key"],
        "collection_key": row["collection_key"],
        "sensor_lane": LANE_BY_RECIPE_KEY.get(row["recipe_key"]),
        "window_start": row["window_start"],
        "window_end": row["window_end"],
        "outcome": row["outcome"],
        "reason_codes": row["reason_codes"],
        "acquisition_count": row["acquisition_count"],
        "eligible_acquisition_count": row["eligible_acquisition_count"],
        "usable_observation_fraction": (
            float(row["usable_observation_fraction"])
            if row["usable_observation_fraction"] is not None
            else None
        ),
        "applied_qa_profile": row["applied_qa_profile"],
        "recorded_at": row["recorded_at"],
    }


def _observation_with_series_query():
    return select(
        s.eo_observation,
        s.eo_series.c.recipe_key,
        s.eo_series.c.collection_key,
    ).select_from(s.eo_observation.join(s.eo_series, s.eo_observation.c.series_id == s.eo_series.c.id))


@router.get("/observations")
def list_observations(
    db: DB,
    aoi_version_id: UUID | None = None,
    series_id: UUID | None = None,
    sensor_lane: str | None = None,
    limit: int = Query(50, ge=1, le=500),
):
    """``sensor_lane`` (``s2_optical``/``s1_ascending``/``s1_descending``)
    lets a caller ask for exactly one real stream when several exist for
    the same ``aoi_version_id`` -- never mix them and pick "the latest"
    across streams, which is what silently mislabeled an S1 observation
    as Sentinel-2 before this endpoint returned series identity at all.
    """
    query = _observation_with_series_query().order_by(s.eo_observation.c.window_start.desc()).limit(limit)
    if series_id:
        query = query.where(s.eo_observation.c.series_id == series_id)
    elif aoi_version_id:
        series_ids = select(s.eo_series.c.id).where(s.eo_series.c.aoi_version_id == aoi_version_id)
        if sensor_lane:
            recipe_keys = [k for k, v in LANE_BY_RECIPE_KEY.items() if v == sensor_lane]
            series_ids = series_ids.where(s.eo_series.c.recipe_key.in_(recipe_keys))
        query = query.where(s.eo_observation.c.series_id.in_(series_ids))
    else:
        raise HTTPException(422, "aoi_version_id or series_id is required")
    rows = db.execute(query).mappings().all()
    results = []
    for row in rows:
        summary = _observation_summary(row)
        summary["features"] = _feature_values(db, row["id"])
        results.append(summary)
    return results


@router.get("/observations/{observation_id}")
def get_observation(observation_id: UUID, db: DB):
    row = (
        db.execute(_observation_with_series_query().where(s.eo_observation.c.id == observation_id))
        .mappings()
        .one_or_none()
    )
    if not row:
        raise HTTPException(404, "EO observation not found")
    processing_run = (
        db.execute(select(s.processing_run).where(s.processing_run.c.id == row["processing_run_id"]))
        .mappings()
        .one()
    )
    source_items = db.execute(
        select(s.eo_source_item)
        .select_from(s.processing_input.join(s.eo_source_item, s.processing_input.c.eo_source_item_id == s.eo_source_item.c.id))
        .where(s.processing_input.c.processing_run_id == row["processing_run_id"])
    ).mappings()
    return {
        **_observation_summary(row),
        "features": _feature_values(db, row["id"]),
        "discovery_manifest": row["discovery_manifest"],
        "processing_run": {
            "id": processing_run["id"],
            "processing_version_id": processing_run["processing_version_id"],
            "configuration": processing_run["configuration"],
            "started_at": processing_run["started_at"],
            "completed_at": processing_run["completed_at"],
            "output_manifest_hash": processing_run["output_manifest_hash"],
        },
        "source_items": [
            {
                "item_id": item["item_id"],
                "collection_key": item["collection_key"],
                "sensing_start": item["sensing_start"],
                "platform": item["platform"],
                "processing_baseline": item["processing_baseline"],
            }
            for item in source_items
        ],
    }


@router.get("/series/{series_id}")
def get_series(series_id: UUID, db: DB):
    row = db.execute(select(s.eo_series).where(s.eo_series.c.id == series_id)).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "EO series not found")
    observations = (
        db.execute(
            select(s.eo_observation)
            .where(s.eo_observation.c.series_id == series_id)
            .order_by(s.eo_observation.c.window_start)
        )
        .mappings()
        .all()
    )
    return {
        "id": row["id"],
        "aoi_version_id": row["aoi_version_id"],
        "world_id": row["world_id"],
        "provider_key": row["provider_key"],
        "collection_key": row["collection_key"],
        "recipe_key": row["recipe_key"],
        "recipe_version": row["recipe_version"],
        "qa_profile_key": row["qa_profile_key"],
        "qa_profile_version": row["qa_profile_version"],
        "statistics_profile": row["statistics_profile"],
        "observations": [
            {**_observation_summary(o), "features": _feature_values(db, o["id"])} for o in observations
        ],
    }


@router.get("/coverage-summary")
def coverage_summary(db: DB, country: str, target_months: int = Query(12, ge=1, le=60)):
    """Map-scale multi-sensor completeness read model (observatory v0.2
    frontend, section 5): one row per real frozen-cohort member, with
    S2/S1-ascending/S1-descending completed-month counts and latest
    outcome -- built server-side from real ``processing.eo_job`` rows so
    the map never has to issue one request per AOI per sensor. Generic by
    ``country``; works identically for UG and KE cohorts without
    country-specific code. Sensor semantics (completed/latest/outcome)
    are computed here, never re-derived in the frontend.
    """
    lane_rows = db.execute(
        text(
            """
            WITH cohort AS (
                SELECT cm.entity_id, cm.source_record_key, cm.aoi_id, cm.aoi_version_id, e.canonical_name
                FROM processing.eo_cohort_member cm
                JOIN processing.eo_cohort c ON c.id = cm.cohort_id AND c.country = :country
                JOIN core.entity e ON e.id = cm.entity_id
            ),
            lane_jobs AS (
                SELECT
                    cohort.entity_id,
                    CASE j.recipe_key
                        WHEN 's2-sr-optical-v1' THEN 's2_optical'
                        WHEN 's1-grd-backscatter-ascending-v1' THEN 's1_ascending'
                        WHEN 's1-grd-backscatter-descending-v1' THEN 's1_descending'
                    END AS lane,
                    j.status, j.window_start, o.outcome, o.usable_observation_fraction
                FROM cohort
                JOIN processing.eo_job j ON j.aoi_version_id = cohort.aoi_version_id
                LEFT JOIN observations.eo_observation o ON o.id = j.eo_observation_id
                WHERE j.recipe_key IN (
                    's2-sr-optical-v1', 's1-grd-backscatter-ascending-v1', 's1-grd-backscatter-descending-v1'
                )
            ),
            completeness AS (
                SELECT entity_id, lane, count(DISTINCT date_trunc('month', window_start)) AS completed_months
                FROM lane_jobs WHERE status = 'succeeded' GROUP BY 1, 2
            ),
            latest AS (
                SELECT DISTINCT ON (entity_id, lane)
                    entity_id, lane, window_start, outcome, usable_observation_fraction
                FROM lane_jobs WHERE status = 'succeeded'
                ORDER BY entity_id, lane, window_start DESC
            )
            SELECT
                cohort.entity_id, cohort.canonical_name, cohort.aoi_id, cohort.aoi_version_id,
                lanes.lane,
                coalesce(comp.completed_months, 0) AS completed_months,
                l.window_start AS latest_window_start, l.outcome AS latest_outcome,
                l.usable_observation_fraction AS latest_usable_support
            FROM cohort
            CROSS JOIN (VALUES ('s2_optical'), ('s1_ascending'), ('s1_descending')) AS lanes(lane)
            LEFT JOIN completeness comp ON comp.entity_id = cohort.entity_id AND comp.lane = lanes.lane
            LEFT JOIN latest l ON l.entity_id = cohort.entity_id AND l.lane = lanes.lane
            """
        ),
        {"country": country},
    ).mappings().all()

    by_entity: dict[str, dict] = {}
    for row in lane_rows:
        entity_id = str(row["entity_id"])
        entry = by_entity.setdefault(
            entity_id,
            {
                "entity_id": entity_id,
                "name": row["canonical_name"],
                "aoi_id": str(row["aoi_id"]),
                "aoi_version_id": str(row["aoi_version_id"]),
                "country": country,
                "lanes": {},
            },
        )
        entry["lanes"][row["lane"]] = {
            "completed_months": row["completed_months"],
            "target_months": target_months,
            "latest_observation_month": (
                row["latest_window_start"].strftime("%Y-%m") if row["latest_window_start"] else None
            ),
            "latest_outcome": row["latest_outcome"],
            "latest_usable_support": (
                float(row["latest_usable_support"]) if row["latest_usable_support"] is not None else None
            ),
        }

    if by_entity:
        corroboration_rows = db.execute(
            text(
                """
                SELECT DISTINCT ON (entity_id) entity_id, state, reference_window_start
                FROM processing.cross_sensor_corroboration
                WHERE entity_id = ANY(:entity_ids)
                ORDER BY entity_id, reference_window_start DESC
                """
            ),
            {"entity_ids": list(by_entity.keys())},
        ).mappings().all()
        for row in corroboration_rows:
            by_entity[str(row["entity_id"])]["latest_corroboration_state"] = row["state"]

    return list(by_entity.values())


@router.get("/change-evidence")
def change_evidence(db: DB, aoi_version_id: UUID):
    """Observatory v0.2 read model for one AOI: real change candidates
    (never a biological label -- interpretation_class is DB-constrained to
    OBSERVATION_CHANGE) plus cross-sensor corroboration, each candidate
    carrying its evidence-quality grade and any confounder findings
    verbatim from ``metadata``. Never fuses sensor streams; a candidate's
    ``sensor_stream``/``features`` say exactly what produced it.
    """
    candidates = db.execute(
        select(s.change_candidate)
        .where(s.change_candidate.c.aoi_version_id == aoi_version_id, s.change_candidate.c.status == "active")
        .order_by(s.change_candidate.c.candidate_window_start.desc())
    ).mappings().all()
    corroborations = db.execute(
        select(s.cross_sensor_corroboration)
        .where(s.cross_sensor_corroboration.c.aoi_version_id == aoi_version_id)
        .order_by(s.cross_sensor_corroboration.c.reference_window_start.desc())
    ).mappings().all()
    corroboration_members = {}
    for corroboration in corroborations:
        members = db.execute(
            select(s.cross_sensor_corroboration_member.c.change_candidate_id).where(
                s.cross_sensor_corroboration_member.c.corroboration_id == corroboration["id"]
            )
        ).scalars().all()
        corroboration_members[str(corroboration["id"])] = [str(m) for m in members]

    return {
        "aoi_version_id": str(aoi_version_id),
        "candidates": [
            {
                "id": c["id"],
                "sensor_stream": c["sensor_stream"],
                "features": c["features"],
                "baseline_window": {"start": c["baseline_window_start"], "end": c["baseline_window_end"]},
                "candidate_window": {"start": c["candidate_window_start"], "end": c["candidate_window_end"]},
                "algorithm": c["algorithm"],
                "algorithm_version": c["algorithm_version"],
                "config_version": c["config_version"],
                "statistic": float(c["statistic"]),
                "persistence": float(c["persistence"]) if c["persistence"] is not None else None,
                "common_support_fraction": (
                    float(c["common_support_fraction"]) if c["common_support_fraction"] is not None else None
                ),
                "interpretation_class": c["interpretation_class"],
                "evidence_grade": (c["metadata"] or {}).get("evidence_quality", {}).get("grade"),
                "evidence_quality": (c["metadata"] or {}).get("evidence_quality"),
                "confounders": (c["metadata"] or {}).get("confounders"),
                "spatial_evidence": (c["metadata"] or {}).get("spatial_evidence"),
            }
            for c in candidates
        ],
        "corroborations": [
            {
                "id": corroboration["id"],
                "state": corroboration["state"],
                "reference_window": {
                    "start": corroboration["reference_window_start"],
                    "end": corroboration["reference_window_end"],
                },
                "distinct_stream_count": corroboration["distinct_stream_count"],
                "distinct_sensor_family_count": corroboration["distinct_sensor_family_count"],
                "distinct_modality_count": corroboration["distinct_modality_count"],
                "max_temporal_offset_days": (
                    float(corroboration["max_temporal_offset_days"])
                    if corroboration["max_temporal_offset_days"] is not None
                    else None
                ),
                "member_change_candidate_ids": corroboration_members[str(corroboration["id"])],
            }
            for corroboration in corroborations
        ],
    }


@router.get("/country-status")
def country_status(
    db: DB,
    country: str,
    spatial_type: str,
    limit: int = Query(1000, ge=1, le=2000),
):
    """National EO-status read model for the existing map (country-pass
    Part 11): one row per matching AOI, its latest observation's status,
    period and usable coverage -- ``not_processed`` for a CFR with no
    observation yet. Never a "forest health" score; ``eo_status`` is one of
    the outcome vocabulary (success/partial/no_observation/failed) plus
    the technical ``not_processed`` state.
    """
    rows = db.execute(
        text(
            """
            SELECT
                e.id AS entity_id,
                e.canonical_name AS name,
                a.id AS aoi_id,
                av.id AS aoi_version_id,
                lo.outcome AS eo_status,
                lo.window_start AS observation_month,
                lo.usable_observation_fraction AS usable_observation_fraction,
                lo.applied_qa_profile AS applied_qa_profile
            FROM core.entity e
            JOIN geo.aoi a ON a.geometry_owner_entity_id = e.id
            JOIN geo.aoi_version av ON av.aoi_id = a.id AND av.superseded_at IS NULL
            LEFT JOIN observations.eo_series es ON es.aoi_version_id = av.id
            LEFT JOIN observations.latest_eo_observation lo ON lo.series_id = es.id
            WHERE a.metadata->>'spatial_type' = :spatial_type
              AND a.metadata->>'country' = :country
            ORDER BY e.canonical_name
            LIMIT :limit
            """
        ),
        {"spatial_type": spatial_type, "country": country, "limit": limit},
    ).mappings()
    return [
        {
            "entity_id": row["entity_id"],
            "name": row["name"],
            "aoi_id": row["aoi_id"],
            "aoi_version_id": row["aoi_version_id"],
            "eo_status": row["eo_status"] or "not_processed",
            "observation_month": row["observation_month"].strftime("%Y-%m") if row["observation_month"] else None,
            "usable_observation_fraction": (
                float(row["usable_observation_fraction"])
                if row["usable_observation_fraction"] is not None
                else None
            ),
            "applied_qa_profile": row["applied_qa_profile"],
        }
        for row in rows
    ]
