"""Real access/legal evidence pass for the Zurkt/Evergreen catchment CFRs
(Track v3-7).

Searches the operational canonical database for ANY per-CFR evidence that
would let a CFR be classified as KNOWN_POTENTIALLY_AVAILABLE or
KNOWN_RESTRICTED_OR_UNAVAILABLE, rather than assuming an answer. Checked
sources (see the query below): geo.aoi.metadata and core.entity.metadata
for every CFR in the uganda_cfr_commercial_eo_mvp scope -- the only places
any ingested license/concession/management-plan/protection-tier/production
evidence could currently live.

RESULT (2026-09, documented not assumed): every one of the 276 catchment
CFRs carries only the generic ingestion metadata {"country": "UG",
"eo_scope": true, "spatial_type": "reserve"} / {"source_dataset":
"central-forest-reserves", "source_record_key": <name>} -- i.e. all of them
share the SAME undifferentiated "gazetted Central Forest Reserve" legal
designation (a real, if generic, designation -- NFA jurisdiction, not e.g.
private land or a stricter national-park protection tier) and nothing
further. No license, concession, management-plan, or production-permit
record exists for ANY of them.

Per the sprint's explicit instruction ("Unknown remains unknown... For
UNKNOWN CFRs: retain scenario availability distribution"), this script
therefore assigns ALL 276 CFRs to UNKNOWN -- not a fabricated split into
"available" vs "restricted" subsets that the evidence does not support.
This null result is itself the honest finding, not a placeholder failure.

Usage:
    uv run python scripts/zurkt_access_state.py \
        --catchment ../outputs/supply/evergreen-uganda-catchment-v2-routed.json \
        --output ../outputs/supply/zurkt-access-state-v3.json \
        --expected-database ea_forests_uganda_country_pass
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.db.session import engine_for
from app.db.target_guard import add_expected_database_argument, require_database

ACCESS_STATES = ("KNOWN_POTENTIALLY_AVAILABLE", "KNOWN_RESTRICTED_OR_UNAVAILABLE", "UNKNOWN")


def classify(aoi_metadata: dict, entity_metadata: dict) -> tuple[str, str]:
    """Returns (state, provenance_note). Searches ONLY for evidence this
    repo has actually ingested -- never infers legal status from EO, never
    invents a differentiation the source data doesn't support."""
    spatial_type = aoi_metadata.get("spatial_type")
    # A stricter protection tier than a generic reserve WOULD be real
    # evidence of restriction, if it existed in the ingested data -- it does
    # not (spatial_type is uniformly "reserve" across all 656 Uganda AOIs in
    # this database, confirmed by direct query), so this branch is
    # documented but currently never taken.
    if spatial_type and spatial_type not in ("reserve",):
        return "KNOWN_RESTRICTED_OR_UNAVAILABLE", f"aoi.metadata.spatial_type={spatial_type!r} (stricter than generic reserve)"
    if any(k in entity_metadata for k in ("license_id", "concession_id", "management_plan_id", "production_permit_id")):
        return "KNOWN_POTENTIALLY_AVAILABLE", "entity.metadata carries a license/concession/management-plan/production-permit reference"
    return "UNKNOWN", (
        "No license/concession/management-plan/production-permit/protection-tier evidence exists in this "
        f"CFR's ingested aoi.metadata={aoi_metadata!r} or entity.metadata={entity_metadata!r} -- all 276 "
        "catchment CFRs share this same undifferentiated 'gazetted Central Forest Reserve' designation."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catchment", required=True, type=Path, help="A zurkt/evergreen catchment JSON (for the CFR entity_id list)")
    parser.add_argument("--output", required=True, type=Path)
    add_expected_database_argument(parser)
    args = parser.parse_args()

    catchment = json.loads(args.catchment.read_text(encoding="utf-8"))
    entity_ids = [c["entity_id"] for c in catchment["cfrs"]]

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    require_database(engine, args.expected_database, label="Zurkt access-state evidence pass target")

    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT a.geometry_owner_entity_id AS entity_id, a.metadata AS aoi_metadata, e.metadata AS entity_metadata
                FROM geo.aoi a
                JOIN core.entity e ON e.id = a.geometry_owner_entity_id
                WHERE a.geometry_owner_entity_id = ANY(:ids)
                """
            ),
            {"ids": entity_ids},
        ).all()

    by_entity = {str(r[0]): (r[1] or {}, r[2] or {}) for r in rows}

    classified = []
    counts = {s: 0 for s in ACCESS_STATES}
    for cfr in catchment["cfrs"]:
        aoi_md, entity_md = by_entity.get(cfr["entity_id"], ({}, {}))
        state, note = classify(aoi_md, entity_md)
        counts[state] += 1
        classified.append(
            {
                "entity_id": cfr["entity_id"],
                "canonical_name": cfr["canonical_name"],
                "access_state": state,
                "provenance": note,
            }
        )

    output = {
        "method": (
            "Searched geo.aoi.metadata and core.entity.metadata for every catchment CFR for any license/"
            "concession/management-plan/production-permit/protection-tier evidence. EO evidence is explicitly "
            "NOT used to infer legal/access status (Track v3-7 constraint). SCENARIO commercial_availability_"
            "fraction applies only to UNKNOWN CFRs, per the sprint's instruction; KNOWN_RESTRICTED_OR_UNAVAILABLE "
            "CFRs would be excluded entirely from evidence-supported addressable supply, and KNOWN_POTENTIALLY_"
            "AVAILABLE CFRs would bypass the scenario fraction -- neither currently has any members."
        ),
        "counts": counts,
        "cfrs": classified,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {args.output}")
    print(f"  KNOWN_POTENTIALLY_AVAILABLE: {counts['KNOWN_POTENTIALLY_AVAILABLE']}")
    print(f"  KNOWN_RESTRICTED_OR_UNAVAILABLE: {counts['KNOWN_RESTRICTED_OR_UNAVAILABLE']}")
    print(f"  UNKNOWN: {counts['UNKNOWN']}")


if __name__ == "__main__":
    main()
