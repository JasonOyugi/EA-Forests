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
    return {
        "id": row["id"],
        "series_id": row["series_id"],
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


@router.get("/observations")
def list_observations(
    db: DB,
    aoi_version_id: UUID | None = None,
    series_id: UUID | None = None,
    limit: int = Query(50, ge=1, le=500),
):
    query = select(s.eo_observation).order_by(s.eo_observation.c.window_start.desc()).limit(limit)
    if series_id:
        query = query.where(s.eo_observation.c.series_id == series_id)
    elif aoi_version_id:
        series_ids = select(s.eo_series.c.id).where(s.eo_series.c.aoi_version_id == aoi_version_id)
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
        db.execute(select(s.eo_observation).where(s.eo_observation.c.id == observation_id))
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
