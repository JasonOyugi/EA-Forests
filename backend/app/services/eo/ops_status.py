"""Minimal internal EO operations read-model (observatory v1, section 11).

National backfills now run for hours; this answers "are the national
observation jobs healthy?" from real ``processing.eo_job`` state without
manual SQL. Not an end-user UI -- a read-only status query, safe to run
concurrently with any live backfill.
"""

from __future__ import annotations

from sqlalchemy import text


def backfill_status(session, *, collection_key: str | None = None) -> dict:
    filters = "WHERE collection_key = :collection_key" if collection_key else ""
    params = {"collection_key": collection_key} if collection_key else {}

    by_status = session.execute(
        text(
            f"""
            SELECT collection_key, recipe_key, status, count(*) AS n
            FROM processing.eo_job
            {filters}
            GROUP BY collection_key, recipe_key, status
            ORDER BY collection_key, recipe_key, status
            """
        ),
        params,
    ).mappings().all()

    runtime_stats = session.execute(
        text(
            f"""
            SELECT
                collection_key, recipe_key,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at))) AS p50_seconds,
                percentile_cont(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at))) AS p90_seconds,
                count(*) FILTER (WHERE status = 'succeeded') AS succeeded_count,
                count(*) FILTER (WHERE attempts > 1) AS retried_count
            FROM processing.eo_job
            {filters}{" AND" if filters else "WHERE"} completed_at IS NOT NULL AND started_at IS NOT NULL
            GROUP BY collection_key, recipe_key
            """
        ),
        params,
    ).mappings().all()

    queue_health = session.execute(
        text(
            f"""
            SELECT
                collection_key, recipe_key,
                min(requested_at) FILTER (WHERE status IN ('queued','retry_wait')) AS oldest_queued,
                max(completed_at) AS last_progress_at,
                count(*) FILTER (WHERE status = 'running' AND lease_expires_at < clock_timestamp()) AS stuck_leases
            FROM processing.eo_job
            {filters}
            GROUP BY collection_key, recipe_key
            """
        ),
        params,
    ).mappings().all()

    return {
        "by_status": [dict(row) for row in by_status],
        "runtime_seconds": [dict(row) for row in runtime_stats],
        "queue_health": [dict(row) for row in queue_health],
    }
