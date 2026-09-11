"""Kenya AOI promotion + cohort freeze (observatory v1, section 3).

Promotes every real, valid Kenya ``forest_candidate`` entity (already
ingested by ``ingest_spatial_forests.py`` into ``core.entity``/
``geo.geometry_observation`` -- no polygon evidence is created here, only
named) to a canonical ``geo.aoi``/``geo.aoi_version``, reusing the exact
generic promotion function Uganda's CFR path inspired
(``app.services.ingestion.spatial.aoi_promotion.promote_geometry_to_aoi``).
Then freezes the result into a Kenya EO execution cohort
(``app.services.eo.cohort.freeze_cohort``) -- the same architecture Uganda
uses, ``country="KE"``, no Kenya-specific spatial tables.

Source families (gazetted/community forests vs. tree plantations) are kept
distinguishable via ``source_family`` in each AOI version's metadata --
never collapsed into one undifferentiated "Kenya forest" class.

Usage:
    uv run python scripts/promote_kenya_forests_to_aoi.py \
        --cohort-key kenya-forest-observation-cohort --definition-version v1
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
from app.services.eo.cohort import freeze_cohort
from app.services.ingestion.spatial.aoi_promotion import promote_geometry_to_aoi
from app.services.state.registry import bootstrap

DATASETS = ("KE-GAZETTED-FOREST", "KE-TREE-PLANTATIONS")
ANALYSIS_SCOPE = "kenya_forest_candidate_eo_mvp"


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
    parser.add_argument("--cohort-key", default="kenya-forest-observation-cohort")
    parser.add_argument("--definition-version", default="v1")
    parser.add_argument("--output", default=None)
    add_expected_database_argument(parser)
    args = parser.parse_args()

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    require_database(engine, args.expected_database, label="Kenya AOI promotion target")

    promoted = 0
    already_promoted = 0
    skipped_no_geometry = []
    by_family = {}
    candidates = []

    with Session(engine) as db:
        db.begin()
        bootstrap(db)
        world_id = db.scalar(select(s.world.c.id).where(s.world.c.name == "production"))

        identities = db.execute(
            select(s.external_identity).where(
                s.external_identity.c.dataset.in_(DATASETS),
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
            result = promote_geometry_to_aoi(
                db,
                entity_id=str(identity["entity_id"]),
                world_id=str(world_id),
                geometry_observation_id=str(geometry_row["id"]),
                analysis_scope=ANALYSIS_SCOPE,
                provenance_class=provenance_class,
                country="KE",
                spatial_type="forest_candidate",
                name=metadata.get("source_name"),
                extra_metadata={"source_family": identity["dataset"]},
            )
            if result["already_promoted"]:
                already_promoted += 1
            else:
                promoted += 1
            by_family[identity["dataset"]] = by_family.get(identity["dataset"], 0) + 1
            # eo_cohort_member's identity is (cohort_id, source_record_key) --
            # cohort-scoped, not dataset-scoped. Unlike Uganda's single-dataset
            # cohort, Kenya freezes TWO datasets into one cohort, and each
            # dataset's own layer:feature_id identity key (e.g. "0:1") can
            # collide across datasets (confirmed live: it does). Namespace by
            # dataset here to keep the member key globally unique; this does
            # not change external_identity's own (dataset, source_record_key,
            # role) key, which was already unique per dataset.
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
            country="KE",
            cohort_key=args.cohort_key,
            definition_version=args.definition_version,
            candidates=candidates,
            note=(
                f"Kenya forest-candidate observation cohort: {by_family} promoted from "
                f"real, live-ingested KE-GAZETTED-FOREST/KE-TREE-PLANTATIONS evidence."
            ),
        )
        db.commit()

    summary = {
        "identities_seen": len(identities),
        "promoted_new": promoted,
        "already_promoted": already_promoted,
        "skipped_no_geometry": skipped_no_geometry,
        "by_source_family": by_family,
        "cohort": cohort_result,
    }
    print(json.dumps(summary, indent=2))
    if args.output:
        Path(args.output).write_text(json.dumps(summary, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
