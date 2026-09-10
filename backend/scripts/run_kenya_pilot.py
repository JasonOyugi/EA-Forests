"""Kenya real S2/S1 pilot (observatory v1, section 3.2): runs the EXISTING,
country-agnostic EO job pipeline (the same ``enqueue``/``claim_job``/
``execute_claimed_job`` path Uganda's national backfill uses) against a
deterministic, representative sample of the frozen Kenya cohort -- no
Kenya-specific EO code. Sample selection is by real area percentile within
each source family (gazetted/community forests vs. tree plantations),
never by "shows an interesting change", per programme rule.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import engine_for
from app.services.eo.ee_provider import (
    COLLECTION_KEY,
    PROVIDER_KEY,
    S1_COLLECTION_KEY,
    EarthEngineProvider,
)
from app.services.eo.feature_registry import FEATURE_RECIPE_KEY, FEATURE_RECIPE_VERSION
from app.services.eo.pipeline import STATISTICS_PROFILE
from app.services.eo.sar_feature_registry import (
    QA_PROFILE_KEY as S1_QA_PROFILE_KEY,
)
from app.services.eo.sar_feature_registry import RECIPE_KEY_ASCENDING, RECIPE_KEY_DESCENDING
from app.services.eo.sar_feature_registry import RECIPE_VERSION as S1_RECIPE_VERSION
from app.services.eo.worker import claim_job, enqueue, execute_claimed_job
from app.services.evidence.artifacts import LocalArtifactStore

S2_QA_PROFILE = "s2-qa-scl-core/1"

SPECS = [
    {
        "collection_key": COLLECTION_KEY,
        "recipe_key": FEATURE_RECIPE_KEY,
        "recipe_version": FEATURE_RECIPE_VERSION,
        "qa_profile_key": S2_QA_PROFILE,
        "qa_profile_version": "1",
        "label": "s2",
    },
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


def select_pilot_members(session, *, cohort_key, definition_version, per_family, min_area_ha):
    rows = session.execute(
        text(
            """
            SELECT cm.source_record_key, cm.aoi_version_id,
                   av.metadata->>'source_family' AS family, av.area_m2 / 10000 AS area_ha
            FROM processing.eo_cohort_member cm
            JOIN processing.eo_cohort c ON c.id = cm.cohort_id
            JOIN geo.aoi_version av ON av.id = cm.aoi_version_id
            WHERE c.country = 'KE' AND c.cohort_key = :cohort_key AND c.definition_version = :definition_version
              AND av.area_m2 / 10000 > :min_area_ha
            ORDER BY family, area_ha
            """
        ),
        {"cohort_key": cohort_key, "definition_version": definition_version, "min_area_ha": min_area_ha},
    ).mappings().all()

    by_family: dict[str, list] = {}
    for row in rows:
        by_family.setdefault(row["family"], []).append(row)

    def evenly_spaced(items, n):
        if not items:
            return []
        if len(items) <= n:
            return items
        indices = sorted({round(i * (len(items) - 1) / (n - 1)) for i in range(n)})
        return [items[i] for i in indices]

    selected = []
    for family, items in sorted(by_family.items()):
        selected.extend(evenly_spaced(items, per_family))
    return selected


def month_window(year: int, month: int):
    start = datetime(year, month, 1, tzinfo=UTC)
    end_year, end_month = (year + 1, 1) if month == 12 else (year, month + 1)
    end = datetime(end_year, end_month, 1, tzinfo=UTC)
    return start, end


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cohort-key", default="kenya-forest-observation-cohort")
    parser.add_argument("--definition-version", default="v1")
    parser.add_argument("--per-family", type=int, default=4)
    parser.add_argument("--min-area-ha", type=float, default=1.0)
    parser.add_argument("--month", default="2026-08")
    parser.add_argument("--worker-id", default="kenya-pilot-worker")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    year, month = (int(x) for x in args.month.split("-"))
    window_start, window_end = month_window(year, month)

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    store = LocalArtifactStore(os.environ.get("CANONICAL_ARTIFACT_ROOT", ".cache/canonical-artifacts"))
    provider = EarthEngineProvider()

    results = []
    with Session(engine) as db:
        members = select_pilot_members(
            db,
            cohort_key=args.cohort_key,
            definition_version=args.definition_version,
            per_family=args.per_family,
            min_area_ha=args.min_area_ha,
        )
        # select_pilot_members()'s read auto-begins an implicit transaction
        # on this Session (SQLAlchemy 2.0 autobegin); close it explicitly so
        # the job loop's own db.begin() below does not fail with "a
        # transaction is already begun on this Session" -- same bug class
        # already fixed once in run_uganda_national_history.py.
        db.commit()
        print(f"Selected {len(members)} pilot assets:", flush=True)
        for m in members:
            print(f"  {m['source_record_key']} ({m['family']}, {float(m['area_ha']):.1f} ha)", flush=True)

        for member in members:
            for spec in SPECS:
                db.begin()
                job = enqueue(
                    db,
                    aoi_version_id=str(member["aoi_version_id"]),
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

                outcome = {"source_record_key": member["source_record_key"], "lane": spec["label"]}
                if job.get("deduplicated") and job.get("status") in ("succeeded", "failed"):
                    outcome["result"] = f"deduplicated:{job['status']}"
                    results.append(outcome)
                    print(f"  {outcome}", flush=True)
                    continue

                db.begin()
                claimed = claim_job(db, worker_id=args.worker_id)
                if claimed is None:
                    db.rollback()
                    outcome["result"] = "claim_failed"
                    results.append(outcome)
                    continue
                db.commit()

                db.begin()
                try:
                    exec_result = execute_claimed_job(db, provider, claimed, store=store)
                    db.commit()
                except Exception as exc:  # noqa: BLE001 - one asset's failure must not abort the pilot
                    db.rollback()
                    exec_result = {"status": "failed", "error": str(exc)}
                outcome["result"] = exec_result.get("status")
                outcome["outcome"] = exec_result.get("outcome")
                outcome["error"] = exec_result.get("error")
                results.append(outcome)
                print(f"  {outcome}", flush=True)

    summary = {"month": args.month, "assets": len(members), "results": results}
    Path(args.output).write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
    print(f"Wrote {args.output}", flush=True)


if __name__ == "__main__":
    main()
