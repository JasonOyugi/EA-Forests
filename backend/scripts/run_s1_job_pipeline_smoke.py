"""Live end-to-end proof that Sentinel-1 runs through the REAL durable job
pipeline (enqueue -> claim -> execute -> persist -> series retrieval), not
just the provider-level discover()/extract() proof already done for Epor.

ENGINEERING PILOTS ONLY (per docs/eo/pilot_site_manifest_v2.json -- no
calibration-grade site exists yet). Results here are software-correctness
evidence, not biological findings about these CFRs.
"""

from __future__ import annotations

import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import database_url, engine_for
from app.services.eo.ee_provider import S1_COLLECTION_KEY, EarthEngineProvider
from app.services.eo.sar_feature_registry import (
    QA_PROFILE_KEY,
    RECIPE_KEY_ASCENDING,
    RECIPE_KEY_DESCENDING,
    RECIPE_VERSION,
)
from app.services.eo.worker import claim_job, enqueue, execute_claimed_job
from app.services.site_classification import ensure_earth_engine_initialized

ENGINEERING_PILOT_CFRS = ["Epor", "Zulia", "Musamya"]
# Deliberately distinct from the stale 2026-06-01..2026-09-01 request hash
# left behind by the pre-fix run (cancelled, not deleted -- eo_job history is
# append-only) so this retry creates fresh jobs instead of deduplicating
# onto rows inserted before provider_key/collection_key existed.
WINDOW_START = datetime(2026, 6, 1, tzinfo=UTC)
WINDOW_END = datetime(2026, 8, 31, tzinfo=UTC)


def aoi_version_id_for(conn, name: str) -> str:
    return str(
        conn.execute(
            text(
                """
                SELECT av.id
                FROM core.entity e
                JOIN geo.aoi a ON a.subject_entity_id = e.id
                JOIN geo.aoi_version av ON av.aoi_id = a.id AND av.superseded_at IS NULL
                WHERE e.canonical_name = :name
                """
            ),
            {"name": name},
        ).scalar()
    )


def main() -> None:
    ensure_earth_engine_initialized()
    provider = EarthEngineProvider()
    engine = engine_for(database_url())

    results = []
    with Session(engine) as db:
        for cfr_name in ENGINEERING_PILOT_CFRS:
            aoi_version_id = aoi_version_id_for(db, cfr_name)
            for recipe_key, label in [(RECIPE_KEY_ASCENDING, "ascending"), (RECIPE_KEY_DESCENDING, "descending")]:
                job = enqueue(
                    db,
                    aoi_version_id=aoi_version_id,
                    window_start=WINDOW_START,
                    window_end=WINDOW_END,
                    provider_key="google_earth_engine",
                    collection_key=S1_COLLECTION_KEY,
                    recipe_key=recipe_key,
                    recipe_version=RECIPE_VERSION,
                    qa_profile_key=QA_PROFILE_KEY,
                    qa_profile_version=RECIPE_VERSION,
                    statistics_profile="moments-v1",
                )
                claimed = claim_job(db, worker_id="s1-pipeline-smoke")
                db.commit()  # the claim must be durable before Earth Engine work starts (real worker semantics)
                result = execute_claimed_job(db, provider, claimed, store=None)
                db.commit()
                print(f"{cfr_name} [{label}]: job={job['id']} status={result['status']}", flush=True)
                results.append({"cfr": cfr_name, "orbit": label, "job_id": str(job["id"]), "result": result})

    # Verify series retrieval + orbit separation from persisted state.
    with engine.connect() as conn:
        for cfr_name in ENGINEERING_PILOT_CFRS:
            series_rows = conn.execute(
                text(
                    """
                    SELECT es.id, es.recipe_key, count(eo.id) AS observation_count
                    FROM observations.eo_series es
                    JOIN geo.aoi_version av ON av.id = es.aoi_version_id
                    JOIN geo.aoi a ON a.id = av.aoi_id
                    JOIN core.entity e ON e.id = a.subject_entity_id
                    LEFT JOIN observations.eo_observation eo ON eo.series_id = es.id
                    WHERE e.canonical_name = :name AND es.collection_key = :collection
                    GROUP BY es.id, es.recipe_key
                    """
                ),
                {"name": cfr_name, "collection": S1_COLLECTION_KEY},
            ).fetchall()
            print(f"{cfr_name} S1 series:", series_rows, flush=True)

    import json

    out_path = Path(__file__).resolve().parents[2] / "outputs" / "eo" / "s1_job_pipeline_smoke_2026-09.json"
    out_path.write_text(json.dumps(results, indent=2, default=str), encoding="utf-8")
    print(f"\nwrote {out_path}")


if __name__ == "__main__":
    main()
