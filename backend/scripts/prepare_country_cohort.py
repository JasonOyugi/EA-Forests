"""Freeze the Uganda national EO execution cohort (observatory v1, section
1): a one-time, read-only snapshot of existing AOI versions, kept separate
from canonical ingestion. Run this ONCE (or once per new
``--definition-version``) before a sensor backfill; sensor backfills then
read the frozen cohort (``app.services.eo.cohort.load_cohort``) instead of
re-running ``ingest_cfr_polygons`` for the whole estate on every invocation.

Safe to run concurrently with an already-running sensor backfill against
the same database: it only reads canonical entity/aoi/aoi_version state and
writes to the new, unrelated ``processing.eo_cohort``/``eo_cohort_member``
tables -- it never touches ``geo.aoi``/``geo.aoi_version``/``evidence.*`` or
``processing.eo_job``.

Usage:
    uv run python scripts/prepare_country_cohort.py \
        --country UG --cohort-key uganda-cfr-observation-cohort --definition-version v1
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import schema as s
from app.db.session import engine_for
from app.db.target_guard import add_expected_database_argument, require_database
from app.services.eo.cohort import freeze_cohort, resolve_uganda_cfr_candidates
from app.services.state.registry import bootstrap

INVENTORY = (
    Path(__file__).resolve().parents[2]
    / "vite-version/docs/data-provenance/uganda-cfr-spatial-spine-inventory.json"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", default="UG")
    parser.add_argument("--cohort-key", default="uganda-cfr-observation-cohort")
    parser.add_argument("--definition-version", default="v1")
    parser.add_argument("--output", default=None)
    add_expected_database_argument(parser)
    args = parser.parse_args()

    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    candidate_keys = [r["source_record_key"] for r in inventory["records"] if r["eo_scope"]]

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    require_database(engine, args.expected_database, label="Country cohort target")
    with Session(engine) as db:
        db.begin()
        bootstrap(db)
        world_id = db.scalar(select(s.world.c.id).where(s.world.c.name == "production"))
        candidates, unresolved = resolve_uganda_cfr_candidates(db, candidate_keys)
        result = freeze_cohort(
            db,
            world_id=world_id,
            country=args.country,
            cohort_key=args.cohort_key,
            definition_version=args.definition_version,
            candidates=candidates,
            note=(
                f"Uganda CFR observation cohort, frozen read-only from "
                f"existing canonical AOI versions ({len(candidate_keys)} eo_scope "
                f"candidates from the spatial-spine inventory)."
            ),
        )
        db.commit()

    summary = {
        "country": args.country,
        "cohort_key": args.cohort_key,
        "definition_version": args.definition_version,
        "created": result["created"],
        "cohort_id": result["cohort_id"],
        "candidate_count": len(candidate_keys),
        "member_count": result["member_count"],
        "unresolved_count": len(unresolved),
        "unresolved_source_record_keys": unresolved,
    }
    print(json.dumps(summary, indent=2))
    if args.output:
        Path(args.output).write_text(json.dumps(summary, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
