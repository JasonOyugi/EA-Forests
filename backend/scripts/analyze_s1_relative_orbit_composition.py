"""S1 relative-orbit COMPOSITION sensitivity (observatory v1, section 1):
the prior audit established that relative-orbit MEMBERSHIP is stable over
time per CFR/direction. This asks the sharper question: for the ~12% of
CFR/direction pairs with two relative orbits, does which orbit DOMINATES a
given month's scene mix shift over time -- which could manufacture a false
temporal signal even with unchanged membership (e.g. September mostly
orbit A, October mostly orbit B). Read-only against already-persisted
scene metadata; safe alongside the live backfills.
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
                    cm.source_record_key, si.properties->>'orbit_pass' AS direction,
                    si.properties->>'relative_orbit' AS relative_orbit,
                    date_trunc('month', j.window_start) AS month
                FROM processing.eo_job j
                JOIN processing.input inp
                    ON inp.processing_run_id = j.processing_run_id AND inp.input_kind = 'source_item'
                JOIN evidence.eo_source_item si ON si.id = inp.eo_source_item_id
                JOIN processing.eo_cohort_member cm ON cm.aoi_version_id = j.aoi_version_id
                WHERE j.collection_key = 'COPERNICUS/S1_GRD' AND j.status = 'succeeded'
                """
            )
        ).mappings().all()

    # (cfr, direction) -> month -> relative_orbit -> scene count
    counts: dict[tuple, dict] = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    ros_seen: dict[tuple, set] = defaultdict(set)
    for row in rows:
        key = (row["source_record_key"], row["direction"])
        ro = row["relative_orbit"] or "UNKNOWN"
        month = row["month"].strftime("%Y-%m")
        counts[key][month][ro] += 1
        ros_seen[key].add(ro)

    multi_orbit_keys = [k for k, ros in ros_seen.items() if len(ros) > 1]

    per_key_report = {}
    max_dominance_swing = 0.0
    swingiest_key = None
    for key in multi_orbit_keys:
        months = sorted(counts[key].keys())
        dominant_fraction_by_month = {}
        dominant_ro_by_month = {}
        for month in months:
            ro_counts = counts[key][month]
            total = sum(ro_counts.values())
            dominant_ro, dominant_count = max(ro_counts.items(), key=lambda kv: kv[1])
            dominant_fraction_by_month[month] = dominant_count / total
            dominant_ro_by_month[month] = dominant_ro
        # "Composition swing": has the DOMINANT relative orbit itself changed
        # across months with real co-occurring data (both ROs present)?
        distinct_dominants = set(dominant_ro_by_month.values())
        swing = len(distinct_dominants) > 1
        fractions = list(dominant_fraction_by_month.values())
        variability = (max(fractions) - min(fractions)) if len(fractions) > 1 else 0.0
        if variability > max_dominance_swing:
            max_dominance_swing = variability
            swingiest_key = key
        per_key_report[f"{key[0]}/{key[1]}"] = {
            "months_with_data": len(months),
            "dominant_ro_by_month": dominant_ro_by_month,
            "dominant_fraction_by_month": {m: round(f, 3) for m, f in dominant_fraction_by_month.items()},
            "dominant_orbit_changed_across_months": swing,
        }

    summary = {
        "multi_orbit_cfr_direction_pairs": len(multi_orbit_keys),
        "pairs_where_dominant_orbit_changed_month_to_month": sum(
            1 for v in per_key_report.values() if v["dominant_orbit_changed_across_months"]
        ),
        "max_month_to_month_dominance_swing_fraction": round(max_dominance_swing, 3),
        "swingiest_pair": f"{swingiest_key[0]}/{swingiest_key[1]}" if swingiest_key else None,
        "detail": per_key_report,
    }
    out_path = Path(__file__).resolve().parents[2] / "outputs" / "eo" / "s1_relative_orbit_composition.json"
    out_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in summary.items() if k != "detail"}, indent=2))
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
