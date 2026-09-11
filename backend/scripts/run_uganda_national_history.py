"""Uganda national EO history backfill -- Sentinel-2 and Sentinel-1, the
same frozen 656-CFR cohort, month by month.

Generalizes the proven single-month scripts/run_uganda_country_pass.py
(S2, August 2026) into a resumable multi-month, multi-sensor loop, reusing
the exact same real leased-worker path (google_earth_engine provider,
never fake) and the reliability hardening added since (provider/work-unit
deadlines in ee_provider.py, retry backoff in worker.py, per-attempt audit
in processing.eo_job_attempt).

Resumability: enqueue() deduplicates on request_hash (aoi_version + window +
provider/collection/recipe/qa/statistics), so re-running this script for a
month/sensor/recipe combination that already has a terminal (succeeded or
exhausted-failed) job is cheap and safe -- it returns the existing row
without re-touching Earth Engine. Interrupting and restarting this script is
therefore safe by construction, not by any special resume flag.

Cohort separation (observatory v1, section 1): this script used to call
``ingest_cfr_polygons`` for the full 656-CFR estate at the start of every
single invocation -- redundant once canonical geometry already exists, and
the direct cause of a verified PostgreSQL advisory-lock contention when the
S1 and S2 backfills both tried to re-ingest the same estate concurrently.
It now reads a pre-frozen cohort (``scripts/prepare_country_cohort.py``,
``app.services.eo.cohort.load_cohort``) instead: a fast, contention-free
read against ``processing.eo_cohort_member`` naming AOI versions that
already exist. Run ``prepare_country_cohort.py`` once first.

Circuit breaker: a small in-process reliability.CircuitBreaker pauses new
claims (sleeping, not aborting) if repeated transient provider failures land
within its window -- the durable queue holds the real work safely while it
cools down.

Usage:
    uv run python scripts/run_uganda_national_history.py \
        --sensor s2 --months 2025-09,2025-10,...,2026-08 \
        --output outputs/eo/uganda-s2-history-run.json
    uv run python scripts/run_uganda_national_history.py \
        --sensor s1 --months 2025-09,...,2026-08 \
        --output outputs/eo/uganda-s1-history-run.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session

from app.db.session import engine_for
from app.db.target_guard import add_expected_database_argument, require_database
from app.services.eo.cohort import load_cohort
from app.services.eo.ee_provider import (
    COLLECTION_KEY,
    PROVIDER_KEY,
    S1_COLLECTION_KEY,
    EarthEngineProvider,
)
from app.services.eo.feature_registry import (
    FEATURE_RECIPE_KEY,
    FEATURE_RECIPE_VERSION,
)
from app.services.eo.pipeline import STATISTICS_PROFILE
from app.services.eo.reliability import RETRYABLE_REASON_CODES, CircuitBreaker
from app.services.eo.sar_feature_registry import (
    QA_PROFILE_KEY as S1_QA_PROFILE_KEY,
)
from app.services.eo.sar_feature_registry import (
    RECIPE_KEY_ASCENDING,
    RECIPE_KEY_DESCENDING,
)
from app.services.eo.sar_feature_registry import (
    RECIPE_VERSION as S1_RECIPE_VERSION,
)
from app.services.eo.worker import claim_job, enqueue, execute_claimed_job
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.state.registry import bootstrap

S2_QA_PROFILE = "s2-qa-scl-core/1"


def month_window(year: int, month: int):
    start = datetime(year, month, 1, tzinfo=UTC)
    end_year, end_month = (year + 1, 1) if month == 12 else (year, month + 1)
    end = datetime(end_year, end_month, 1, tzinfo=UTC)
    return start, end


def parse_months(spec: str) -> list[tuple[int, int]]:
    out = []
    for token in spec.split(","):
        token = token.strip()
        year, month = token.split("-")
        out.append((int(year), int(month)))
    return out


def recipe_specs(sensor: str) -> list[dict]:
    if sensor == "s2":
        return [
            {
                "collection_key": COLLECTION_KEY,
                "recipe_key": FEATURE_RECIPE_KEY,
                "recipe_version": FEATURE_RECIPE_VERSION,
                "qa_profile_key": S2_QA_PROFILE,
                "qa_profile_version": "1",
                "label": "s2",
            }
        ]
    if sensor == "s1":
        return [
            {
                "collection_key": S1_COLLECTION_KEY,
                "recipe_key": RECIPE_KEY_ASCENDING,
                "recipe_version": S1_RECIPE_VERSION,
                "qa_profile_key": S1_QA_PROFILE_KEY,
                "qa_profile_version": S1_RECIPE_VERSION,
                "label": "s1-ascending",
            },
            {
                "collection_key": S1_COLLECTION_KEY,
                "recipe_key": RECIPE_KEY_DESCENDING,
                "recipe_version": S1_RECIPE_VERSION,
                "qa_profile_key": S1_QA_PROFILE_KEY,
                "qa_profile_version": S1_RECIPE_VERSION,
                "label": "s1-descending",
            },
        ]
    raise ValueError(sensor)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sensor", choices=["s2", "s1"], required=True)
    parser.add_argument("--months", required=True, help="Comma-separated YYYY-MM list")
    parser.add_argument("--output", required=True)
    parser.add_argument("--limit", type=int, default=None, help="Process only the first N cohort members (debug)")
    parser.add_argument("--worker-id", default="uganda-national-history-worker")
    parser.add_argument("--country", default="UG")
    parser.add_argument("--cohort-key", default="uganda-cfr-observation-cohort")
    parser.add_argument("--definition-version", default="v1")
    add_expected_database_argument(parser)
    args = parser.parse_args()

    months = parse_months(args.months)
    specs = recipe_specs(args.sensor)

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    require_database(engine, args.expected_database, label="Uganda national history target")
    store = LocalArtifactStore(os.environ.get("CANONICAL_ARTIFACT_ROOT", ".cache/canonical-artifacts"))
    provider = EarthEngineProvider()
    breaker = CircuitBreaker()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    # Scientific outcome vocabulary (success/partial/no_observation/failed)
    # kept separate from job-status counters (retry_wait/deduplicated/
    # ingest_failed) -- a "succeeded" job can carry any scientific outcome.
    tally = {"success": 0, "partial": 0, "no_observation": 0, "failed": 0, "retry_wait": 0, "deduplicated": 0, "ingest_failed": 0}
    started_at = time.monotonic()

    with Session(engine) as db:
        db.begin()
        bootstrap(db)
        db.commit()

        aoi_version_by_key = load_cohort(
            db, country=args.country, cohort_key=args.cohort_key, definition_version=args.definition_version
        )
        # load_cohort()'s read auto-begins an implicit transaction on this
        # Session (SQLAlchemy 2.0 autobegin); close it explicitly so the job
        # loop's own db.begin() below does not fail with "a transaction is
        # already begun on this Session".
        db.commit()
        if not aoi_version_by_key:
            raise RuntimeError(
                f"No frozen cohort members for {args.country}/{args.cohort_key}/{args.definition_version} -- "
                "run scripts/prepare_country_cohort.py first."
            )
        if args.limit:
            aoi_version_by_key = dict(list(aoi_version_by_key.items())[: args.limit])
        print(f"Loaded frozen cohort: {len(aoi_version_by_key)} EO-processable CFRs (no re-ingestion).", flush=True)

        total_units = len(aoi_version_by_key) * len(months) * len(specs)
        print(f"{len(aoi_version_by_key)} CFRs x {len(months)} months x {len(specs)} recipe(s) = {total_units} work units", flush=True)

        done = 0
        for year, month in months:
            window_start, window_end = month_window(year, month)
            for spec in specs:
                print(f"--- {year}-{month:02d} [{spec['label']}] ---", flush=True)
                for key, aoi_version_id in aoi_version_by_key.items():
                    done += 1
                    if breaker.is_open():
                        reason = breaker.reason()
                        print(f"  circuit breaker open, pausing 30s: {reason}", flush=True)
                        time.sleep(30)
                    db.begin()
                    job = enqueue(
                        db,
                        aoi_version_id=aoi_version_id,
                        window_start=window_start,
                        window_end=window_end,
                        provider_key=PROVIDER_KEY,
                        collection_key=spec["collection_key"],
                        recipe_key=spec["recipe_key"],
                        recipe_version=spec["recipe_version"],
                        qa_profile_key=spec["qa_profile_key"],
                        qa_profile_version=spec["qa_profile_version"],
                        statistics_profile=STATISTICS_PROFILE,
                    )
                    db.commit()

                    if job.get("deduplicated") and job.get("status") in ("succeeded", "failed"):
                        tally["deduplicated"] += 1
                        if job["status"] == "succeeded":
                            breaker.record_success()
                        continue

                    db.begin()
                    try:
                        claimed = claim_job(db, worker_id=args.worker_id)
                    except Exception as exc:  # noqa: BLE001
                        db.rollback()
                        print(f"  CLAIM FAILED {key}: {exc}", flush=True)
                        continue
                    if claimed is None:
                        db.rollback()
                        tally["deduplicated"] += 1
                        continue
                    db.commit()  # commit the claim before calling Earth Engine

                    db.begin()
                    try:
                        exec_result = execute_claimed_job(db, provider, claimed, store=store)
                        db.commit()
                    except Exception as exc:  # noqa: BLE001 - one CFR's failure must not abort the run
                        db.rollback()
                        exec_result = {"status": "failed", "error": str(exc), "reason_code": "UNCLASSIFIED_EXCEPTION"}

                    status = exec_result.get("status", "failed")
                    reason_code = exec_result.get("reason_code")
                    if status == "succeeded":
                        breaker.record_success()
                        outcome = exec_result.get("outcome") or "unknown_outcome"
                        tally[outcome] = tally.get(outcome, 0) + 1
                    elif reason_code in RETRYABLE_REASON_CODES:
                        breaker.record_failure(reason_code=reason_code)
                        tally["retry_wait" if status == "retry_wait" else "failed"] += 1
                    else:
                        tally["failed"] += 1

                    if done % 100 == 0:
                        elapsed = time.monotonic() - started_at
                        print(
                            f"  {done}/{total_units} ({elapsed / 3600:.2f}h elapsed) tally={tally}",
                            flush=True,
                        )
                        output_path.write_text(
                            json.dumps({"tally": tally, "done": done, "total": total_units, "elapsed_s": elapsed}, indent=2),
                            encoding="utf-8",
                        )

    elapsed = time.monotonic() - started_at
    output_path.write_text(
        json.dumps({"tally": tally, "done": done, "total": total_units, "elapsed_s": elapsed, "complete": True}, indent=2),
        encoding="utf-8",
    )
    print(f"Done. {tally}. Wrote {output_path}", flush=True)


if __name__ == "__main__":
    main()
