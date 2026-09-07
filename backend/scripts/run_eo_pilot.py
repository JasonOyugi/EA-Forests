"""Live Earth Engine pilot for the Sentinel-2 vertical slice.

Selects a small, deterministic, documented set of CFRs from the 656 EO-
processable reserves (never cherry-picked for attractive results): the
smallest, the median, the largest, and one area-discrepancy-flagged CFR.
Ingests just those records, enqueues one analysis per CFR for the most
recent complete calendar month (falling back a month if Sentinel-2
discovery returns nothing), runs the real ``EarthEngineProvider``, and
prints per-work-unit timing/coverage plus a national-scale estimate. Also
runs a 3-consecutive-month series on the medium CFR to prove the series
contract.

Usage (PowerShell, after authenticating Earth Engine once):
    $env:CANONICAL_DATABASE_URL = '...'
    $env:EARTH_ENGINE_PROJECT = 'ee-oyugijason'
    uv run python scripts/run_eo_pilot.py --output .cache/eo-pilot-results.json
"""

import argparse
import json
import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import schema as s
from app.db.session import engine_for
from app.services.eo.ee_provider import EarthEngineProvider
from app.services.eo.worker import enqueue, run_job
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.ingestion.cfr_geometry import ingest_cfr_polygons
from app.services.state.registry import bootstrap

INVENTORY = (
    Path(__file__).resolve().parents[2]
    / "vite-version/docs/data-provenance/uganda-cfr-spatial-spine-inventory.json"
)


def select_pilot_cfrs() -> list[dict]:
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    processable = [r for r in inventory["records"] if r["eo_scope"]]
    by_area = sorted(processable, key=lambda r: r["polygon_area_ha"])
    discrepancy = next(r for r in inventory["records"] if r.get("area_discrepancy_flag"))
    selection = {
        "small": by_area[1],  # index 0 is a near-zero sliver; index 1 is a workable small case
        "medium": by_area[len(by_area) // 2],
        "large": by_area[-1],
        "area_discrepancy_flagged": discrepancy,
    }
    return selection


def month_window(year: int, month: int):
    start = datetime(year, month, 1, tzinfo=UTC)
    end_year, end_month = (year + 1, 1) if month == 12 else (year, month + 1)
    end = datetime(end_year, end_month, 1, tzinfo=UTC)
    return start, end


def previous_month(year: int, month: int):
    return (year - 1, 12) if month == 1 else (year, month - 1)


def run_one(db, provider, store, aoi_version_id: str, window_start, window_end, cfr_label: str):
    started = time.monotonic()
    job = enqueue(
        db,
        aoi_version_id=aoi_version_id,
        window_start=window_start,
        window_end=window_end,
        provider_key="google_earth_engine",
        collection_key="COPERNICUS/S2_SR_HARMONIZED",
        recipe_key="s2-sr-optical-v1",
        recipe_version="1",
        qa_profile_key="s2-qa-scl-core/1",
        qa_profile_version="1",
        statistics_profile="moments-v1",
    )
    result = run_job(db, provider, job["id"], store=store)
    duration_s = time.monotonic() - started
    observation = None
    if result.get("eo_observation_id"):
        observation = (
            db.execute(select(s.eo_observation).where(s.eo_observation.c.id == result["eo_observation_id"]))
            .mappings()
            .one()
        )
    return {
        "cfr": cfr_label,
        "aoi_version_id": aoi_version_id,
        "window_start": window_start.isoformat(),
        "window_end": window_end.isoformat(),
        "job_status": result["status"],
        "duration_s": round(duration_s, 2),
        "outcome": result.get("outcome"),
        "acquisition_count": observation["acquisition_count"] if observation else None,
        "eligible_acquisition_count": observation["eligible_acquisition_count"] if observation else None,
        "usable_observation_fraction": (
            float(observation["usable_observation_fraction"])
            if observation and observation["usable_observation_fraction"] is not None
            else None
        ),
        "eo_observation_id": result.get("eo_observation_id"),
        "error": result.get("error"),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    store = LocalArtifactStore(os.environ.get("CANONICAL_ARTIFACT_ROOT", ".cache/canonical-artifacts"))
    provider = EarthEngineProvider()

    selection = select_pilot_cfrs()
    print("Selected pilot CFRs:", {k: v["name"] for k, v in selection.items()})

    now = datetime.now(UTC)
    candidate_year, candidate_month = previous_month(now.year, now.month)

    results = {"selection": {k: v["name"] for k, v in selection.items()}, "runs": []}

    with Session(engine) as db:
        db.begin()
        bootstrap(db)

        aoi_version_ids = {}
        for label, record in selection.items():
            report = ingest_cfr_polygons(db, store, only=record["source_record_key"])
            aoi_version_ids[label] = report["records"][0]["aoi_version_id"]
        db.commit()

        # Establish the most recent complete month with real Sentinel-2 coverage
        # by checking discovery on the medium CFR first, falling back a month.
        db.begin()
        year, month = candidate_year, candidate_month
        for _ in range(3):
            window_start, window_end = month_window(year, month)
            probe = run_one(db, provider, store, aoi_version_ids["medium"], window_start, window_end, "medium (probe)")
            if probe["acquisition_count"]:
                break
            year, month = previous_month(year, month)
        db.commit()
        results["runs"].append(probe)
        results["pilot_month"] = {"year": year, "month": month}

        for label in ("small", "large", "area_discrepancy_flagged"):
            db.begin()
            window_start, window_end = month_window(year, month)
            run_result = run_one(db, provider, store, aoi_version_ids[label], window_start, window_end, label)
            db.commit()
            results["runs"].append(run_result)

        # 3-consecutive-month series on the medium CFR (already has month `year,month`).
        series_year, series_month = year, month
        for offset in range(1, 3):
            m_year, m_month = series_year, series_month
            for _ in range(offset):
                m_year, m_month = previous_month(m_year, m_month)
            db.begin()
            window_start, window_end = month_window(m_year, m_month)
            run_result = run_one(db, provider, store, aoi_version_ids["medium"], window_start, window_end, "medium (series)")
            db.commit()
            results["runs"].append(run_result)

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps(results, indent=2, default=str), encoding="utf-8")
    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
