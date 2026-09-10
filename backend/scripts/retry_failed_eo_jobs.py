"""One-off, targeted retry for eo_job rows that exhausted max_attempts
before a real code fix (e.g. the Tanzania large-AOI MAX_PIXELS cap).
``claim_job`` never reclaims status='failed' rows by design -- this
script explicitly resets a caller-specified job id list back to
'queued' (a legitimate operational-table mutation, not touching any
immutable canonical/evidence table) and then runs the real claim +
execute_claimed_job path so the retry goes through the exact same
production code as the original attempt, not a synthetic proxy.

Usage:
    uv run python scripts/retry_failed_eo_jobs.py --job-ids <uuid> <uuid> ...
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import engine_for
from app.services.eo.ee_provider import EarthEngineProvider
from app.services.eo.worker import execute_claimed_job
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.state.registry import audit_context


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--job-ids", nargs="+", required=True)
    parser.add_argument("--worker-id", default="retry-failed-eo-jobs")
    args = parser.parse_args()

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    store = LocalArtifactStore(os.environ.get("CANONICAL_ARTIFACT_ROOT", ".cache/canonical-artifacts"))
    provider = EarthEngineProvider()

    results = []
    with Session(engine) as db:
        db.begin()
        audit_context(db, "eo-worker", f"Reset exhausted EO jobs for retry (worker={args.worker_id})")
        reset = db.execute(
            text(
                """
                UPDATE processing.eo_job
                SET status = 'queued', error = NULL,
                    last_reason_code = NULL, lease_expires_at = NULL,
                    retry_not_before = NULL
                WHERE id = ANY(:ids) AND status IN ('failed', 'running')
                RETURNING id
                """
            ),
            {"ids": args.job_ids},
        ).fetchall()
        db.commit()
        print(f"Reset {len(reset)}/{len(args.job_ids)} jobs to queued.")

        for _ in range(len(args.job_ids)):
            # Scoped claim (only this script's own job ids), not the
            # shared claim_job() query -- the real backfill worker is
            # still running concurrently and must not have its queued
            # work stolen by this one-off retry pass.
            db.begin()
            audit_context(db, "eo-worker", f"Claim EO analysis job (worker={args.worker_id})")
            job_id = db.execute(
                text(
                    """
                    SELECT id FROM processing.eo_job
                    WHERE id = ANY(:ids) AND status = 'queued'
                    ORDER BY requested_at LIMIT 1 FOR UPDATE SKIP LOCKED
                    """
                ),
                {"ids": args.job_ids},
            ).scalar()
            if job_id is None:
                db.commit()
                break
            claimed = dict(
                db.execute(
                    text(
                        """
                        UPDATE processing.eo_job
                        SET status = 'running',
                            lease_expires_at = clock_timestamp() + interval '600 seconds',
                            fencing_token = fencing_token + 1,
                            worker_id = :worker_id,
                            started_at = COALESCE(started_at, clock_timestamp()),
                            attempts = attempts + 1
                        WHERE id = :job_id
                        RETURNING *
                        """
                    ),
                    {"worker_id": args.worker_id, "job_id": job_id},
                ).mappings().one()
            )
            db.commit()
            db.begin()
            exec_result = execute_claimed_job(db, provider, claimed, store=store)
            db.commit()
            results.append(
                {
                    "job_id": str(claimed["id"]),
                    "recipe_key": claimed["recipe_key"],
                    "window_start": str(claimed["window_start"]),
                    **exec_result,
                }
            )
            print(json.dumps(results[-1], default=str))

    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
