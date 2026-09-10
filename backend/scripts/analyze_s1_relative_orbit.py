"""Real audit of Sentinel-1 relative-orbit distribution across the Uganda
national cohort (observatory v1, section 2) -- must be resolved with real
data before any cross-month S1 change interpretation. Read-only: joins
already-persisted scene-level metadata (``evidence.eo_source_item.
properties``, captured live by ``ee_provider.py``'s discovery step for
every S1 job so far), safe to run concurrently with the live backfills.
"""

from __future__ import annotations

import json
import os
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.db.session import database_url, engine_for


def main() -> None:
    os.environ.setdefault(
        "CANONICAL_DATABASE_URL",
        "postgresql+psycopg://ea_forests@127.0.0.1:55433/ea_forests_uganda_country_pass",
    )
    engine = engine_for(database_url())
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT
                    cm.source_record_key,
                    j.recipe_key,
                    date_trunc('month', j.window_start) AS month,
                    si.properties->>'orbit_pass' AS orbit_pass,
                    si.properties->>'relative_orbit' AS relative_orbit,
                    si.properties->>'polarisations' AS polarisations,
                    si.sensing_start
                FROM processing.eo_job j
                JOIN processing.input inp
                    ON inp.processing_run_id = j.processing_run_id AND inp.input_kind = 'source_item'
                JOIN evidence.eo_source_item si ON si.id = inp.eo_source_item_id
                JOIN processing.eo_cohort_member cm ON cm.aoi_version_id = j.aoi_version_id
                WHERE j.collection_key = 'COPERNICUS/S1_GRD' AND j.status = 'succeeded'
                """
            )
        ).mappings().all()

    by_cfr_direction: dict[tuple[str, str], set[str]] = defaultdict(set)
    by_cfr_direction_month: dict[tuple[str, str, str], set[str]] = defaultdict(set)
    relative_orbit_counts: dict[str, int] = defaultdict(int)
    scenes_total = 0
    months_seen = set()

    for row in rows:
        scenes_total += 1
        direction = row["orbit_pass"] or "UNKNOWN"
        month = row["month"].strftime("%Y-%m")
        months_seen.add(month)
        ro = row["relative_orbit"] or "UNKNOWN"
        key = (row["source_record_key"], direction)
        by_cfr_direction[key].add(ro)
        by_cfr_direction_month[(row["source_record_key"], direction, month)].add(ro)
        relative_orbit_counts[f"{direction}:{ro}"] += 1

    cfrs_with_single_relative_orbit_per_direction = 0
    cfrs_with_multiple_relative_orbits = 0
    for _key, ro_set in by_cfr_direction.items():
        if len(ro_set) <= 1:
            cfrs_with_single_relative_orbit_per_direction += 1
        else:
            cfrs_with_multiple_relative_orbits += 1

    month_to_month_relative_orbit_changes = 0
    per_cfr_direction_months: dict[tuple[str, str], list[tuple[str, set[str]]]] = defaultdict(list)
    for (cfr, direction, month), ro_set in by_cfr_direction_month.items():
        per_cfr_direction_months[(cfr, direction)].append((month, ro_set))
    for _key, month_list in per_cfr_direction_months.items():
        month_list.sort()
        prev_ro = None
        for _month, ro_set in month_list:
            if prev_ro is not None and ro_set and prev_ro and ro_set != prev_ro:
                month_to_month_relative_orbit_changes += 1
            prev_ro = ro_set

    summary = {
        "scenes_analyzed": scenes_total,
        "months_with_data_so_far": sorted(months_seen),
        "distinct_cfr_direction_pairs": len(by_cfr_direction),
        "cfrs_with_single_relative_orbit_per_direction": cfrs_with_single_relative_orbit_per_direction,
        "cfrs_with_multiple_relative_orbits_in_available_history": cfrs_with_multiple_relative_orbits,
        "month_to_month_relative_orbit_changes_observed": month_to_month_relative_orbit_changes,
        "relative_orbit_scene_counts_by_direction": dict(relative_orbit_counts),
        "note": (
            "Based on whatever S1 history has been submitted so far by the live "
            "national backfill -- not yet the full 12-month cohort. Re-run this "
            "script once more months complete for a fuller picture; the "
            "single-vs-multiple relative-orbit finding is expected to be stable "
            "since it reflects real satellite orbit geometry, not backfill progress."
        ),
    }
    out_path = Path(__file__).resolve().parents[2] / "outputs" / "eo" / "s1_relative_orbit_audit.json"
    out_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
