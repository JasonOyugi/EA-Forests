"""Durable EO job lifecycle (EO observation architecture section 13).

Software job status (``queued -> running -> succeeded``, with
``retry_wait``/``failed``/``cancelled``) is independent of the scientific
outcome persisted on ``processing.run``/``observations.eo_observation``: a
``succeeded`` job can carry a ``no_observation`` scientific outcome. One
bounded worker process; no Redis/Celery/cloud queue.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select

from app.db import schema as s
from app.services.eo.pipeline import build_analysis_request, run_analysis
from app.services.eo.provider import ProviderError
from app.services.state.registry import audit_context, insert_row

DEFAULT_MAX_ATTEMPTS = 3


def enqueue(
    session,
    *,
    aoi_version_id: str,
    window_start,
    window_end,
    provider_key: str,
    collection_key: str,
    recipe_key: str,
    recipe_version: str,
    qa_profile_key: str,
    qa_profile_version: str,
    statistics_profile: str,
) -> dict:
    """Deterministic dedup on request identity: an equivalent in-flight or
    completed request returns the existing job instead of creating a new one.
    """
    request = build_analysis_request(
        session,
        aoi_version_id=aoi_version_id,
        window_start=window_start,
        window_end=window_end,
        provider_key=provider_key,
        collection_key=collection_key,
        recipe_key=recipe_key,
        recipe_version=recipe_version,
        qa_profile_key=qa_profile_key,
        qa_profile_version=qa_profile_version,
        statistics_profile=statistics_profile,
    )
    request_hash = request.request_hash()
    existing = (
        session.execute(select(s.eo_job).where(s.eo_job.c.request_hash == request_hash))
        .mappings()
        .first()
    )
    if existing:
        return dict(existing) | {"deduplicated": True}
    audit_context(session, "eo-worker", "Enqueue EO analysis job")
    job = insert_row(
        session,
        s.eo_job,
        request_hash=request_hash,
        world_id=request.world_id,
        aoi_version_id=request.aoi_version_id,
        window_start=request.window_start,
        window_end=request.window_end,
        recipe_key=request.recipe_key,
        recipe_version=request.recipe_version,
        qa_profile_key=request.qa_profile_key,
        qa_profile_version=request.qa_profile_version,
        statistics_profile=request.statistics_profile,
        max_attempts=DEFAULT_MAX_ATTEMPTS,
    )
    return dict(job) | {"deduplicated": False}


def run_job(session, provider, job_id, store=None) -> dict:
    """Runs one queued/retry_wait job to completion (success or failure).
    Not a lease/staleness implementation: this vertical slice assumes a
    single worker process running jobs synchronously, one at a time, which is
    sufficient for the bounded pilot and explicitly deferred beyond that
    (see final report -- lease-based multi-worker fencing is not implemented).
    """
    job = session.execute(select(s.eo_job).where(s.eo_job.c.id == job_id)).mappings().one()
    if job["status"] in ("succeeded", "cancelled"):
        return dict(job)

    request = build_analysis_request(
        session,
        aoi_version_id=str(job["aoi_version_id"]),
        window_start=job["window_start"],
        window_end=job["window_end"],
        provider_key="google_earth_engine",
        collection_key="COPERNICUS/S2_SR_HARMONIZED",
        recipe_key=job["recipe_key"],
        recipe_version=job["recipe_version"],
        qa_profile_key=job["qa_profile_key"],
        qa_profile_version=job["qa_profile_version"],
        statistics_profile=job["statistics_profile"],
    )
    session.execute(
        s.eo_job.update()
        .where(s.eo_job.c.id == job_id)
        .values(status="running", started_at=datetime.now(UTC), attempts=job["attempts"] + 1)
    )
    try:
        result = run_analysis(session, provider, request, store=store)
    except ProviderError as exc:
        attempts = job["attempts"] + 1
        if exc.retryable and attempts < job["max_attempts"]:
            session.execute(
                s.eo_job.update()
                .where(s.eo_job.c.id == job_id)
                .values(status="retry_wait", error=exc.message)
            )
            return {"status": "retry_wait", "error": exc.message, "reason_code": exc.reason_code}
        session.execute(
            s.eo_job.update()
            .where(s.eo_job.c.id == job_id)
            .values(status="failed", error=exc.message, completed_at=datetime.now(UTC))
        )
        return {"status": "failed", "error": exc.message, "reason_code": exc.reason_code}

    session.execute(
        s.eo_job.update()
        .where(s.eo_job.c.id == job_id)
        .values(
            status="succeeded",
            completed_at=datetime.now(UTC),
            processing_run_id=result["processing_run_id"],
            eo_observation_id=result["eo_observation_id"],
        )
    )
    return {"status": "succeeded", **result}
