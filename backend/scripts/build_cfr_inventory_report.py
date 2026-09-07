"""Build the machine-readable Uganda CFR spatial-spine inventory (derived
report, not a second source of truth) from a run_cfr_ingestion.py results file.

Usage:
    uv run python scripts/build_cfr_inventory_report.py \
        --results .cache/cfr-ingestion-results.json \
        --json-output ../vite-version/docs/data-provenance/uganda-cfr-spatial-spine-inventory.json \
        --md-output ../vite-version/docs/data-provenance/uganda-cfr-spatial-spine-report.md
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.ingestion.cfr_boundaries import load_boundaries

BLOCKED_STATUSES = {
    "BLOCKED_NO_POLYGON",
    "BLOCKED_IDENTITY_AMBIGUOUS",
    "BLOCKED_INVALID_GEOMETRY",
    "BLOCKED_NO_CANONICAL_ENTITY",
}


def build(records: list[dict]) -> dict:
    linked = [r for r in records if r["reconciliation_status"] == "POLYGON_LINKED"]
    record_only = [r for r in records if r["reconciliation_status"] == "RECORD_ONLY"]
    polygon_only = [r for r in records if r["reconciliation_status"] == "POLYGON_ONLY"]
    ambiguous = [r for r in records if r["reconciliation_status"] == "AMBIGUOUS"]
    invalid = [r for r in linked if r["eo_readiness"] == "BLOCKED_INVALID_GEOMETRY"]
    ready = [r for r in linked if r["eo_readiness"] == "READY"]
    exploratory = [r for r in linked if r["eo_readiness"] == "EXPLORATORY"]
    processable = ready + exploratory
    total_area_ha = sum(r["area_ha"] for r in processable if r.get("area_ha") is not None)

    entries = []
    for r in records:
        entries.append(
            {
                "source_record_key": r.get("source_record_key"),
                "boundary_id": r.get("boundary_id"),
                "name": r.get("name"),
                "reconciliation_status": r.get("reconciliation_status"),
                "reported_area_ha": r.get("reported_area_ha"),
                "polygon_area_ha": r.get("area_ha"),
                "area_discrepancy_fraction": r.get("area_discrepancy_fraction"),
                "aoi_id": r.get("aoi_id"),
                "aoi_version_id": r.get("aoi_version_id"),
                "geometry_observation_id": r.get("geometry_observation_id"),
                "eo_readiness": r.get("eo_readiness"),
                "eo_scope": r.get("eo_scope"),
                "blocking_reason": r.get("blocking_reason"),
            }
        )

    summary = {
        "total_cfr_records": len(records),
        "total_cfr_polygons_in_export": len(load_boundaries()),
        "linked": len(linked),
        "record_only": len(record_only),
        "polygon_only": len(polygon_only),
        "ambiguous": len(ambiguous),
        "invalid": len(invalid),
        "eo_ready": len(ready),
        "eo_exploratory": len(exploratory),
        "eo_blocked": len(records) - len(processable),
        "total_eo_processable_cfrs": len(processable),
        "total_eo_processable_area_ha": total_area_ha,
    }
    return {
        "schema_version": "1",
        "analysis_scope": "uganda_cfr_commercial_eo_mvp",
        "summary": summary,
        "records": entries,
    }


def render_markdown(inventory: dict) -> str:
    s = inventory["summary"]
    lines = [
        "# Uganda CFR spatial-spine inventory",
        "",
        (
            "Derived reconciliation report. Not a source of truth: source records "
            "remain `central-forest-reserves.json`, boundary polygons remain "
            "`generated-boundaries.ts`, and canonical spatial evidence lives in "
            "`geo.aoi` / `geo.aoi_version` in PostgreSQL/PostGIS."
        ),
        "",
        "## Summary",
        "",
        f"- TOTAL CFR RECORDS: {s['total_cfr_records']}",
        f"- TOTAL CFR POLYGONS: {s['total_cfr_polygons_in_export']}",
        f"- LINKED: {s['linked']}",
        f"- RECORD ONLY: {s['record_only']}",
        f"- POLYGON ONLY: {s['polygon_only']}",
        f"- AMBIGUOUS: {s['ambiguous']}",
        f"- INVALID: {s['invalid']}",
        f"- EO READY: {s['eo_ready']}",
        f"- EO EXPLORATORY: {s['eo_exploratory']}",
        f"- EO BLOCKED: {s['eo_blocked']}",
        f"- TOTAL EO-PROCESSABLE CFRS: {s['total_eo_processable_cfrs']}",
        f"- TOTAL EO-PROCESSABLE AREA: {s['total_eo_processable_area_ha']:.1f} ha",
        "",
        "## Blocked / ambiguous / record-only entries",
        "",
        "| Name | Status | EO readiness | Reason |",
        "| --- | --- | --- | --- |",
    ]
    for r in inventory["records"]:
        if r["eo_scope"]:
            continue
        lines.append(
            f"| {r['name']} | {r['reconciliation_status']} | {r['eo_readiness']} | "
            f"{(r['blocking_reason'] or '').replace(chr(10), ' ')} |"
        )
    lines += ["", "## Exploratory entries (in EO scope, provenance/precision flagged)", "",
              "| Name | Reported area (ha) | Polygon area (ha) | Discrepancy | AOI version |",
              "| --- | --- | --- | --- | --- |"]
    for r in inventory["records"]:
        if r["eo_readiness"] != "EXPLORATORY":
            continue
        discrepancy = (
            f"{r['area_discrepancy_fraction']:.1%}" if r["area_discrepancy_fraction"] is not None else "n/a"
        )
        lines.append(
            f"| {r['name']} | {r['reported_area_ha']} | "
            f"{r['polygon_area_ha']:.1f} | {discrepancy} | {r['aoi_version_id']} |"
        )
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--results", required=True)
    parser.add_argument("--json-output", required=True)
    parser.add_argument("--md-output", required=True)
    args = parser.parse_args()

    results = json.loads(Path(args.results).read_text(encoding="utf-8"))
    inventory = build(results["records"])
    Path(args.json_output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.json_output).write_text(json.dumps(inventory, indent=2), encoding="utf-8")
    Path(args.md_output).parent.mkdir(parents=True, exist_ok=True)
    Path(args.md_output).write_text(render_markdown(inventory), encoding="utf-8")
    print(json.dumps(inventory["summary"], indent=2))


if __name__ == "__main__":
    main()
