"""Generic country AOI promotion + cohort freeze (regional observatory,
section 2C). Generalizes the pattern proven for Kenya
(``promote_kenya_forests_to_aoi.py``) so Tanzania -- and any future
country -- reuses the same real architecture instead of a country-specific
script: promote already-ingested ``core.entity``/``geo.geometry_observation``
rows to canonical ``geo.aoi``/``geo.aoi_version`` via
``app.services.ingestion.spatial.aoi_promotion.promote_geometry_to_aoi``,
then freeze the result into a country EO execution cohort via
``app.services.eo.cohort.freeze_cohort``. No new schema, no country-specific
spatial tables.

Usage:
    uv run python scripts/promote_forest_candidates_to_aoi.py \
        --country TZ --datasets TZ-FORESTS \
        --analysis-scope tanzania_forest_candidate_eo_mvp \
        --spatial-type forest_candidate \
        --cohort-key tanzania-forest-observation-cohort --definition-version v1
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
from app.services.eo.cohort import freeze_cohort
from app.services.ingestion.spatial.aoi_promotion import promote_geometry_to_aoi
from app.services.state.registry import bootstrap


def _current_geometry_observation(session, entity_id):
    return (
        session.execute(
            select(s.geometry_observation).where(
                s.geometry_observation.c.entity_id == entity_id,
                s.geometry_observation.c.superseded_at.is_(None),
            )
        )
        .mappings()
        .first()
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", required=True, help="ISO2 country code, e.g. TZ")
    parser.add_argument("--datasets", required=True, help="Comma-separated source_key values to promote")
    parser.add_argument("--analysis-scope", required=True)
    parser.add_argument("--spatial-type", required=True)
    parser.add_argument("--cohort-key", required=True)
    parser.add_argument("--definition-version", default="v1")
    parser.add_argument("--output", default=None)
    args = parser.parse_args()
    datasets = tuple(d.strip() for d in args.datasets.split(",") if d.strip())

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)

    promoted = 0
    already_promoted = 0
    skipped_no_geometry = []
    skipped_invalid_area = []
    by_dataset = {}
    candidates = []

    with Session(engine) as db:
        db.begin()
        bootstrap(db)
        world_id = db.scalar(select(s.world.c.id).where(s.world.c.name == "production"))

        identities = db.execute(
            select(s.external_identity).where(
                s.external_identity.c.dataset.in_(datasets),
                s.external_identity.c.role == "forest_candidate",
            )
        ).mappings().all()

        for identity in identities:
            geometry_row = _current_geometry_observation(db, identity["entity_id"])
            if geometry_row is None:
                skipped_no_geometry.append(identity["source_record_key"])
                continue
            metadata = geometry_row["metadata"] or {}
            provenance_class = metadata.get("authority_class", "third_party_spatial_dataset")
            try:
                result = promote_geometry_to_aoi(
                    db,
                    entity_id=str(identity["entity_id"]),
                    world_id=str(world_id),
                    geometry_observation_id=str(geometry_row["id"]),
                    analysis_scope=args.analysis_scope,
                    provenance_class=provenance_class,
                    country=args.country,
                    spatial_type=args.spatial_type,
                    name=metadata.get("source_name"),
                    extra_metadata={"source_family": identity["dataset"]},
                )
            except ValueError as exc:
                # Non-positive area (a real degenerate-geometry rejection,
                # not silently repaired) -- recorded, not promoted.
                skipped_invalid_area.append({"source_record_key": identity["source_record_key"], "reason": str(exc)})
                continue
            if result["already_promoted"]:
                already_promoted += 1
            else:
                promoted += 1
            by_dataset[identity["dataset"]] = by_dataset.get(identity["dataset"], 0) + 1
            # Namespace the cohort member key by dataset -- eo_cohort_member's
            # identity is (cohort_id, source_record_key), cohort-scoped, not
            # dataset-scoped; multiple source datasets in one cohort can
            # otherwise collide on the same underlying layer:feature_id key
            # (confirmed live for Kenya).
            candidates.append(
                {
                    "source_record_key": f"{identity['dataset']}::{identity['source_record_key']}",
                    "entity_id": str(identity["entity_id"]),
                    "aoi_id": result["aoi_id"],
                    "aoi_version_id": result["aoi_version_id"],
                    "geometry_hash": result["geometry_hash"],
                }
            )
        db.commit()

        db.begin()
        cohort_result = freeze_cohort(
            db,
            world_id=str(world_id),
            country=args.country,
            cohort_key=args.cohort_key,
            definition_version=args.definition_version,
            candidates=candidates,
            note=(
                f"{args.country} forest-candidate observation cohort: {by_dataset} promoted from "
                f"real, live-ingested {', '.join(datasets)} evidence."
            ),
        )
        db.commit()

    summary = {
        "country": args.country,
        "datasets": list(datasets),
        "identities_seen": len(identities),
        "promoted_new": promoted,
        "already_promoted": already_promoted,
        "skipped_no_geometry": skipped_no_geometry,
        "skipped_invalid_area": skipped_invalid_area,
        "by_dataset": by_dataset,
        "cohort": cohort_result,
    }
    print(json.dumps(summary, indent=2))
    if args.output:
        Path(args.output).write_text(json.dumps(summary, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
