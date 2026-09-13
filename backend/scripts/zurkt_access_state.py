"""Real access/legal evidence pass for the Zurkt/Evergreen catchment CFRs
(Track v3-7, extended v4-3/4 with external evidence + a 5-state schema).

Two evidence layers, in order:

  1. DATABASE layer -- geo.aoi.metadata / core.entity.metadata for every
     catchment CFR (the only places any ingested license/concession/
     management-plan/protection-tier/production evidence could currently
     live). RESULT (2026-09, documented not assumed): every one of the 276
     catchment CFRs carries only the generic ingestion metadata {"country":
     "UG", "eo_scope": true, "spatial_type": "reserve"} / {"source_dataset":
     "central-forest-reserves", "source_record_key": <name>} -- i.e. all of
     them share the SAME undifferentiated "gazetted Central Forest Reserve"
     legal designation and nothing further.
  2. EXTERNAL EVIDENCE overlay (--external-evidence, optional) -- a curated
     JSON produced from an actual web-research pass against NFA Uganda,
     Ministry of Water & Environment forestry publications, gazette
     notices, forest-management-plan documents, concession/license
     registries, donor/programme reports etc. (see docs/ for the dossier
     this was built from). Where present, this OVERRIDES the database-only
     UNKNOWN default for that specific CFR, with its own source/date/
     confidence recorded -- it never silently replaces real DB evidence
     with a lower-confidence external claim if the DB ever does carry a
     record (DB evidence always wins on conflict, since it is the more
     directly ingested, auditable source for THIS system).

FIVE-STATE SCHEMA (not three -- corrected per explicit instruction):
  KNOWN_POTENTIALLY_AVAILABLE -- real evidence of an active
      license/concession/management plan/documented production or
      offtake relationship, with nothing found that would restrict it.
  KNOWN_RESTRICTED -- real evidence of a protection-tier upgrade,
      moratorium, or documented restriction on commercial harvesting.
  PARTIALLY_EVIDENCED -- some real evidence exists (e.g. confirmed as a
      plantation, or confirmed under NFA direct management) but it does
      not by itself establish or rule out commercial availability.
  UNKNOWN -- no evidence found in either layer. This is an expected,
      common, HONEST answer, not a research failure.
  UNRESOLVED_CONFLICT -- two or more real sources disagree on this CFR's
      status. Never silently resolved in either direction.

Never infers legal/access status from EO, and never infers availability
merely from the absence of restriction language (that would be exactly
the same "absence of evidence = evidence of absence" error the DB-only
pass was designed to avoid).

Usage:
    uv run python scripts/zurkt_access_state.py \
        --catchment ../outputs/supply/evergreen-uganda-catchment-v2-routed.json \
        --output ../outputs/supply/zurkt-access-state-v4.json \
        --external-evidence ../outputs/supply/zurkt-access-external-evidence-v4.json \
        --expected-database ea_forests_uganda_country_pass
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.db.session import engine_for
from app.db.target_guard import add_expected_database_argument, require_database

ACCESS_STATES = (
    "KNOWN_POTENTIALLY_AVAILABLE",
    "KNOWN_RESTRICTED",
    "PARTIALLY_EVIDENCED",
    "UNKNOWN",
    "UNRESOLVED_CONFLICT",
)


def classify_from_database(aoi_metadata: dict, entity_metadata: dict) -> tuple[str, str]:
    """Returns (state, provenance_note) from ONLY this repo's ingested
    database metadata -- never EO, never inference from absence."""
    spatial_type = aoi_metadata.get("spatial_type")
    if spatial_type and spatial_type not in ("reserve",):
        return "KNOWN_RESTRICTED", f"aoi.metadata.spatial_type={spatial_type!r} (stricter than generic reserve)"
    if any(k in entity_metadata for k in ("license_id", "concession_id", "management_plan_id", "production_permit_id")):
        return "KNOWN_POTENTIALLY_AVAILABLE", "entity.metadata carries a license/concession/management-plan/production-permit reference"
    return "UNKNOWN", (
        "No license/concession/management-plan/production-permit/protection-tier evidence exists in this "
        f"CFR's ingested aoi.metadata={aoi_metadata!r} or entity.metadata={entity_metadata!r} -- all catchment "
        "CFRs share this same undifferentiated 'gazetted Central Forest Reserve' designation in this database."
    )


def load_external_evidence(path: Path | None) -> dict[str, dict[str, Any]]:
    """entity_id or canonical_name -> {access_state, rationale, sources: [...], confidence}."""
    if path is None or not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    by_key: dict[str, dict[str, Any]] = {}
    for row in data.get("cfrs", []):
        key = row.get("entity_id") or row.get("canonical_name")
        if key:
            by_key[key] = row
    return by_key


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catchment", required=True, type=Path, help="A zurkt/evergreen catchment JSON (for the CFR entity_id list)")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--external-evidence",
        type=Path,
        default=None,
        help="Optional curated JSON of real external (web-researched) access/legal evidence, keyed by "
        "entity_id or canonical_name -- see module docstring for the schema and evidence sources searched.",
    )
    add_expected_database_argument(parser)
    args = parser.parse_args()

    catchment = json.loads(args.catchment.read_text(encoding="utf-8"))
    entity_ids = [c["entity_id"] for c in catchment["cfrs"]]
    external = load_external_evidence(args.external_evidence)

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
        db_state, db_note = classify_from_database(aoi_md, entity_md)

        ext = external.get(cfr["entity_id"]) or external.get(cfr["canonical_name"])
        if db_state != "UNKNOWN":
            # DB evidence (direct, ingested, auditable) always wins over an
            # external claim if both somehow exist -- documented, not silent.
            final_state, note, sources, confidence = db_state, db_note, [], "database"
        elif ext is not None:
            final_state = ext["access_state"]
            note = ext.get("rationale", "")
            sources = ext.get("sources", [])
            confidence = ext.get("confidence", "unspecified")
        else:
            final_state, note, sources, confidence = "UNKNOWN", db_note, [], "no_evidence_found"

        counts[final_state] += 1
        classified.append(
            {
                "entity_id": cfr["entity_id"],
                "canonical_name": cfr["canonical_name"],
                "access_state": final_state,
                "provenance": note,
                "sources": sources,
                "confidence": confidence,
            }
        )

    resolved_count = sum(counts[s] for s in ("KNOWN_POTENTIALLY_AVAILABLE", "KNOWN_RESTRICTED", "PARTIALLY_EVIDENCED", "UNRESOLVED_CONFLICT"))
    output = {
        "method": (
            "Two-layer evidence pass: (1) geo.aoi.metadata/core.entity.metadata in the operational database, "
            "(2) an optional curated external web-research overlay (--external-evidence) built from NFA Uganda, "
            "Ministry of Water & Environment publications, gazette notices, management-plan documents, "
            "concession/license registries and similar sources. EO evidence is explicitly NEVER used to infer "
            "legal/access status. Availability is never inferred merely from the absence of restriction language."
        ),
        "access_states": list(ACCESS_STATES),
        "counts": counts,
        "resolved_count": resolved_count,
        "unresolved_count": counts["UNKNOWN"],
        "resolution_note": (
            f"{resolved_count} of {len(classified)} CFRs have SOME real access-relevant evidence "
            f"(available+restricted+partial+conflicting); {counts['UNKNOWN']} remain UNKNOWN because no evidence "
            "was found in either layer -- UNKNOWN means the question is UNRESOLVED, not that access is confirmed "
            "absent. Evidence-supported addressable supply should be reported as 'unresolved' for the UNKNOWN "
            "share, never as a confirmed zero."
        ),
        "cfrs": classified,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {args.output}")
    for s in ACCESS_STATES:
        print(f"  {s}: {counts[s]}")


if __name__ == "__main__":
    main()
