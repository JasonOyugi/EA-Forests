"""Durable EO job lifecycle with crash-safe leasing (EO observation
architecture section 13; hardened for the Uganda country pass, Part 6).

Software job status (``queued -> running -> succeeded``, with
``retry_wait``/``failed``/``cancelled``) is independent of the scientific
outcome persisted on ``processing.run``/``observations.eo_observation``: a
``succeeded`` job can carry a ``no_observation`` scientific outcome.

Lease/fencing model: ``claim_job`` atomically claims exactly one claimable job
(``queued``/``retry_wait``, or ``running`` with an expired lease) and stamps a
new ``fencing_token``; the caller must commit that claim before doing any
Earth Engine work, so a crashed worker's lease simply expires and another
claim can recover it. ``publish_job_result``/``publish_job_failure`` only
take effect if the caller still holds the CURRENT fencing token -- a stale
worker that lost its lease to a recovering claim cannot publish a result. One
bounded worker runs this pass; leasing is for crash recovery, not new
concurrency. No Redis/Celery/cloud queue -- PostgreSQL only.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select, text

from app.db import schema as s
from app.services.eo.pipeline import build_analysis_request, run_analysis
from app.services.eo.provider import ProviderError
from app.services.eo.reliability import retry_not_before
from app.services.state.registry import audit_context, insert_row

DEFAULT_MAX_ATTEMPTS = 3
DEFAULT_LEASE_SECONDS = 600


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
        provider_key=request.provider_key,
        collection_key=request.collection_key,
        recipe_key=request.recipe_key,
        recipe_version=request.recipe_version,
        qa_profile_key=request.qa_profile_key,
        qa_profile_version=request.qa_profile_version,
        statistics_profile=request.statistics_profile,
        max_attempts=DEFAULT_MAX_ATTEMPTS,
    )
    return dict(job) | {"deduplicated": False}


def claim_job(session, *, worker_id: str, lease_seconds: int = DEFAULT_LEASE_SECONDS) -> dict | None:
    """Atomically claims the oldest claimable job: ``queued``/``retry_wait``,
    or ``running`` whose lease has expired (a crashed worker's job). Returns
    ``None`` if nothing is claimable. The caller MUST commit this claim
    before starting Earth Engine work -- that commit is what makes the lease
    externally visible to a recovering worker if this one crashes mid-call.
    """
    # audit.record_change() requires this per transaction (it is set LOCAL,
    # so it does not survive the commit boundary between enqueue/claim/publish).
    audit_context(session, "eo-worker", f"Claim EO analysis job (worker={worker_id})")
    job_id = session.execute(
        text(
            """
            SELECT id FROM processing.eo_job
            WHERE status = 'queued'
               OR (status = 'retry_wait' AND (retry_not_before IS NULL OR retry_not_before <= clock_timestamp()))
               OR (status = 'running' AND lease_expires_at < clock_timestamp())
            ORDER BY requested_at
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            """
        )
    ).scalar()
    if job_id is None:
        return None
    row = (
        session.execute(
            text(
                """
                UPDATE processing.eo_job
                SET status = 'running',
                    lease_expires_at = clock_timestamp() + make_interval(secs => :lease_seconds),
                    fencing_token = fencing_token + 1,
                    worker_id = :worker_id,
                    started_at = COALESCE(started_at, clock_timestamp()),
                    attempts = attempts + 1
                WHERE id = :job_id
                RETURNING *
                """
            ),
            {"lease_seconds": lease_seconds, "worker_id": worker_id, "job_id": job_id},
        )
        .mappings()
        .one()
    )
    return dict(row)


def _publish(session, job_id, fencing_token, **values) -> bool:
    """Applies a terminal update only if ``fencing_token`` still matches the
    current lease holder. Returns False (no-op) if the lease was lost --
    the caller's result is real but must be discarded/not trusted as this
    job's canonical outcome; a recovering worker's own run is authoritative.
    """
    result = session.execute(
        s.eo_job.update()
        .where(s.eo_job.c.id == job_id, s.eo_job.c.fencing_token == fencing_token)
        .values(**values)
    )
    return result.rowcount > 0


def _record_attempt(session, *, job_id, attempt_number, worker_id, started_at, outcome, reason_code, error):
    """Append-only per-attempt row (migration 0007): the generic audit trail
    on ``eo_job`` records that the row changed and why, not what happened on
    THIS attempt specifically -- a timed-out attempt must stay auditable as
    its own fact, never mutated into a later successful attempt's row.
    """
    audit_context(session, "eo-worker", f"Record EO job attempt {attempt_number} (worker={worker_id})")
    insert_row(
        session,
        s.eo_job_attempt,
        eo_job_id=job_id,
        attempt_number=attempt_number,
        worker_id=worker_id,
        started_at=started_at,
        completed_at=datetime.now(UTC),
        outcome=outcome,
        reason_code=reason_code,
        error=error,
    )


def execute_claimed_job(session, provider, claimed: dict, store=None) -> dict:
    """Runs Earth Engine discovery/extraction for an already-claimed job and
    publishes the result, guarded by the fencing token captured at claim
    time. Call this only after committing the ``claim_job`` claim.
    """
    job_id = claimed["id"]
    fencing_token = claimed["fencing_token"]
    attempts = claimed["attempts"]
    worker_id = claimed["worker_id"]
    attempt_started_at = claimed["started_at"] or datetime.now(UTC)
    request = build_analysis_request(
        session,
        aoi_version_id=str(claimed["aoi_version_id"]),
        window_start=claimed["window_start"],
        window_end=claimed["window_end"],
        provider_key=claimed["provider_key"],
        collection_key=claimed["collection_key"],
        recipe_key=claimed["recipe_key"],
        recipe_version=claimed["recipe_version"],
        qa_profile_key=claimed["qa_profile_key"],
        qa_profile_version=claimed["qa_profile_version"],
        statistics_profile=claimed["statistics_profile"],
    )
    try:
        result = run_analysis(session, provider, request, store=store)
    except ProviderError as exc:
        will_retry = exc.retryable and attempts < claimed["max_attempts"]
        status = "retry_wait" if will_retry else "failed"
        _record_attempt(
            session,
            job_id=job_id,
            attempt_number=attempts,
            worker_id=worker_id,
            started_at=attempt_started_at,
            outcome=status,
            reason_code=exc.reason_code,
            error=exc.message,
        )
        if will_retry:
            published = _publish(
                session,
                job_id,
                fencing_token,
                status="retry_wait",
                error=exc.message,
                last_reason_code=exc.reason_code,
                retry_not_before=retry_not_before(attempts),
            )
        else:
            published = _publish(
                session,
                job_id,
                fencing_token,
                status="failed",
                error=exc.message,
                last_reason_code=exc.reason_code,
                completed_at=datetime.now(UTC),
            )
        return {
            "status": status,
            "error": exc.message,
            "reason_code": exc.reason_code,
            "lease_held": published,
        }

    _record_attempt(
        session,
        job_id=job_id,
        attempt_number=attempts,
        worker_id=worker_id,
        started_at=attempt_started_at,
        outcome="succeeded",
        reason_code=None,
        error=None,
    )
    published = _publish(
        session,
        job_id,
        fencing_token,
        status="succeeded",
        completed_at=datetime.now(UTC),
        last_reason_code=None,
        processing_run_id=result["processing_run_id"],
        eo_observation_id=result["eo_observation_id"],
    )
    return {"status": "succeeded" if published else "lease_lost", "lease_held": published, **result}


def run_job(session, provider, job_id, store=None, *, worker_id: str = "single-worker") -> dict:
    """Convenience wrapper for tests and single-transaction callers: claims
    and executes a SPECIFIC job by ID within the current session/transaction.
    Uses the same fencing-checked publish path as the production claim/
    execute split, so lease-loss behavior is identical; it just does not
    itself impose a commit boundary between claim and execution (the caller's
    transaction scope does). For a real multi-step worker loop, use
    ``claim_job`` (commit) then ``execute_claimed_job`` (commit) instead.
    """
    job = session.execute(select(s.eo_job).where(s.eo_job.c.id == job_id)).mappings().one()
    if job["status"] in ("succeeded", "cancelled"):
        return dict(job)
    claimed = session.execute(
        text(
            """
            UPDATE processing.eo_job
            SET status = 'running',
                lease_expires_at = clock_timestamp() + make_interval(secs => :lease_seconds),
                fencing_token = fencing_token + 1,
                worker_id = :worker_id,
                started_at = COALESCE(started_at, clock_timestamp()),
                attempts = attempts + 1
            WHERE id = :job_id
            RETURNING *
            """
        ),
        {"lease_seconds": DEFAULT_LEASE_SECONDS, "worker_id": worker_id, "job_id": job_id},
    ).mappings().one()
    return execute_claimed_job(session, provider, dict(claimed), store=store)
