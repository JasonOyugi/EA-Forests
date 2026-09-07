"""Uganda CFR Sentinel-2 country pass v0.1 (EO country-pass Parts 7-9, 14).

Freezes the 656-member EO-processable CFR cohort from the spatial-spine
inventory, ingests their canonical AOIs, then submits ONE common half-open
calendar month for every member via the real leased job worker
(google_earth_engine provider -- never the fake provider). Every CFR is
accounted for in the output manifest: success, partial, no_observation, or
failed (with retries already applied) -- none are silently dropped.

Usage (PowerShell):
    $env:CANONICAL_DATABASE_URL = '...'
    $env:EARTH_ENGINE_PROJECT = 'ee-oyugijason'
    uv run python scripts/run_uganda_country_pass.py --output .cache/uganda-country-pass-run.json
"""

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
from app.services.eo.ee_provider import (
    COLLECTION_KEY,
    PROVIDER_KEY,
    EarthEngineProvider,
)
from app.services.eo.feature_registry import (
    FEATURE_RECIPE_KEY,
    FEATURE_RECIPE_VERSION,
)
from app.services.eo.pipeline import STATISTICS_PROFILE
from app.services.eo.work_limits import WORK_LIMITS_VERSION
from app.services.eo.worker import claim_job, enqueue, execute_claimed_job
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.ingestion.cfr_geometry import ingest_cfr_polygons
from app.services.state.registry import bootstrap

RUN_NAME = "uganda-cfr-s2-country-pass-v0.1"
QA_PROFILE = "s2-qa-scl-core/1"
INVENTORY = (
    Path(__file__).resolve().parents[2]
    / "vite-version/docs/data-provenance/uganda-cfr-spatial-spine-inventory.json"
)


def month_window(year: int, month: int):
    start = datetime(year, month, 1, tzinfo=UTC)
    end_year, end_month = (year + 1, 1) if month == 12 else (year, month + 1)
    end = datetime(end_year, end_month, 1, tzinfo=UTC)
    return start, end


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--month", type=int, required=True)
    parser.add_argument(
        "--limit", type=int, default=None, help="Process only the first N cohort members (debug)"
    )
    args = parser.parse_args()

    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    cohort = [r for r in inventory["records"] if r["eo_scope"]]
    if args.limit:
        cohort = cohort[: args.limit]

    window_start, window_end = month_window(args.year, args.month)
    manifest = {
        "run_name": RUN_NAME,
        "country": "UG",
        "cohort_frozen_at": datetime.now(UTC).isoformat(),
        "cohort_size": len(cohort),
        "cohort_source_record_keys": [r["source_record_key"] for r in cohort],
        "provider_key": PROVIDER_KEY,
        "collection_key": COLLECTION_KEY,
        "recipe_key": FEATURE_RECIPE_KEY,
        "recipe_version": FEATURE_RECIPE_VERSION,
        "qa_profile_key": QA_PROFILE,
        "qa_profile_version": "1",
        "statistics_profile": STATISTICS_PROFILE,
        "work_limits_version": WORK_LIMITS_VERSION,
        "window_start": window_start.isoformat(),
        "window_end": window_end.isoformat(),
    }

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    store = LocalArtifactStore(os.environ.get("CANONICAL_ARTIFACT_ROOT", ".cache/canonical-artifacts"))
    provider = EarthEngineProvider()

    results = []
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with Session(engine) as db:
        db.begin()
        bootstrap(db)
        db.commit()

        print(f"Ingesting {len(cohort)} cohort CFRs...", flush=True)
        aoi_version_by_key = {}
        for i, record in enumerate(cohort):
            db.begin()
            try:
                report = ingest_cfr_polygons(db, store, only=record["source_record_key"])
                row = report["records"][0]
                if row["aoi_version_id"] is None:
                    raise RuntimeError(f"CFR not EO-processable at ingest time: {row}")
                aoi_version_by_key[record["source_record_key"]] = row["aoi_version_id"]
                db.commit()
            except Exception as exc:  # noqa: BLE001 - must not abort the whole cohort ingest
                db.rollback()
                results.append(
                    {
                        "cfr": record["source_record_key"],
                        "status": "ingest_failed",
                        "error": str(exc),
                    }
                )
            if (i + 1) % 100 == 0:
                print(f"  ingested {i + 1}/{len(cohort)}", flush=True)

        manifest["cohort_ingested"] = len(aoi_version_by_key)
        Path(str(output_path) + ".manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

        print(f"Submitting {len(aoi_version_by_key)} EO analysis jobs...", flush=True)
        for i, (key, aoi_version_id) in enumerate(aoi_version_by_key.items()):
            db.begin()
            job = enqueue(
                db,
                aoi_version_id=aoi_version_id,
                window_start=window_start,
                window_end=window_end,
                provider_key=PROVIDER_KEY,
                collection_key=COLLECTION_KEY,
                recipe_key=FEATURE_RECIPE_KEY,
                recipe_version=FEATURE_RECIPE_VERSION,
                qa_profile_key=QA_PROFILE,
                qa_profile_version="1",
                statistics_profile=STATISTICS_PROFILE,
            )
            db.commit()

            started = time.monotonic()
            db.begin()
            try:
                claimed = claim_job(db, worker_id="uganda-country-pass-worker")
            except Exception as exc:  # noqa: BLE001 - one CFR's failure must not drop it from the report
                db.rollback()
                results.append({"cfr": key, "status": "claim_failed", "job_id": str(job["id"]), "error": str(exc)})
                continue
            if claimed is None:
                db.rollback()
                results.append({"cfr": key, "status": "already_terminal", "job_id": str(job["id"])})
                continue
            db.commit()  # commit the claim BEFORE calling Earth Engine

            db.begin()
            try:
                exec_result = execute_claimed_job(db, provider, claimed, store=store)
                db.commit()
            except Exception as exc:  # noqa: BLE001 - one CFR's failure must not drop it from the report
                db.rollback()
                exec_result = {"status": "failed", "error": str(exc)}
            duration_s = time.monotonic() - started

            results.append(
                {
                    "cfr": key,
                    "aoi_version_id": aoi_version_id,
                    "job_id": str(claimed["id"]),
                    "status": exec_result.get("status"),
                    "outcome": exec_result.get("outcome"),
                    "duration_s": round(duration_s, 2),
                    "eo_observation_id": exec_result.get("eo_observation_id"),
                    "error": exec_result.get("error"),
                }
            )
            if (i + 1) % 25 == 0:
                elapsed = sum(r.get("duration_s", 0) for r in results)
                print(f"  processed {i + 1}/{len(aoi_version_by_key)} (elapsed EE time {elapsed:.0f}s)", flush=True)
                output_path.write_text(json.dumps({"manifest": manifest, "results": results}, indent=2, default=str), encoding="utf-8")

    output_path.write_text(json.dumps({"manifest": manifest, "results": results}, indent=2, default=str), encoding="utf-8")
    print(f"Done. Wrote {len(results)} results to {output_path}")


if __name__ == "__main__":
    main()
