"""Builds the Uganda EO country-pass national summary (Part 10) from a
completed run_uganda_country_pass.py results file plus the persisted
observations it produced. Derived report only -- canonical truth stays in
observations.eo_observation / eo_feature_value.
"""

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
from app.services.eo.country_pass import CohortMember, build_country_summary

INVENTORY = (
    Path(__file__).resolve().parents[2]
    / "vite-version/docs/data-provenance/uganda-cfr-spatial-spine-inventory.json"
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-results", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    run = json.loads(Path(args.run_results).read_text(encoding="utf-8"))
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    area_by_key = {r["source_record_key"]: r["polygon_area_ha"] for r in inventory["records"] if r["eo_scope"]}

    engine = engine_for(os.environ["CANONICAL_DATABASE_URL"])
    members = []
    with Session(engine) as db:
        for row in run["results"]:
            key = row["cfr"]
            usable = None
            eligible = None
            if row.get("eo_observation_id"):
                observation = (
                    db.execute(
                        select(s.eo_observation).where(s.eo_observation.c.id == row["eo_observation_id"])
                    )
                    .mappings()
                    .one_or_none()
                )
                if observation is not None:
                    usable = (
                        float(observation["usable_observation_fraction"])
                        if observation["usable_observation_fraction"] is not None
                        else None
                    )
                    eligible = observation["eligible_acquisition_count"]
            members.append(
                CohortMember(
                    source_record_key=key,
                    area_ha=area_by_key.get(key, 0.0),
                    job_status=row.get("status"),
                    outcome=row.get("outcome"),
                    usable_observation_fraction=usable,
                    eligible_acquisition_count=eligible,
                )
            )

    missing = set(area_by_key) - {m.source_record_key for m in members}
    if missing:
        raise SystemExit(f"Run results are missing {len(missing)} cohort members: {sorted(missing)[:5]}...")

    summary = build_country_summary(members)
    summary["run_manifest"] = run.get("manifest", {})
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.output).write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
    print(json.dumps({k: v for k, v in summary.items() if k != "run_manifest"}, indent=2, default=str))


if __name__ == "__main__":
    main()
