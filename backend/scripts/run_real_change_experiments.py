"""Real change experiments on the Uganda national history (observatory v1,
sections 2-6). Sensor-native: each (stream, feature) series is analyzed
independently -- NDVI/NDMI/NBR for S2, VV/VH for S1 ascending and
descending, never fused. Only run against real, already-persisted
eo_observation/eo_feature_value rows; no synthetic data. Method minimum-
history gates are never lowered to force a result (a CFR/feature series
with <3 usable months is skipped, not padded).

Writes real processing.change_candidate rows (interpretation_class is
DB-constrained to OBSERVATION_CHANGE) and, per CFR, a single
processing.cross_sensor_corroboration comparing whether s2_optical,
s1_ascending, s1_descending independently flagged a temporally compatible
change -- using each stream's PRIMARY feature (ndvi for optical, s1_vv for
radar) as that stream's representative vote, since corroboration compares
independent OBSERVATION PROCESSES, not within-stream feature agreement.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db import schema as s
from app.db.session import engine_for
from app.services.eo.change_domain import create_change_candidate, create_cross_sensor_corroboration
from app.services.eo.change_methods import SeriesPoint, run_methods
from app.services.eo.cohort import load_cohort
from app.services.eo.ee_provider import COLLECTION_KEY, S1_COLLECTION_KEY
from app.services.eo.feature_registry import FEATURE_RECIPE_KEY
from app.services.eo.sar_feature_registry import RECIPE_KEY_ASCENDING, RECIPE_KEY_DESCENDING

MIN_SUPPORT_FRACTION = 0.3

STREAMS = [
    {"stream": "s2_optical", "collection_key": COLLECTION_KEY, "recipe_key": FEATURE_RECIPE_KEY,
     "features": ["ndvi", "ndmi", "nbr"], "primary_feature": "ndvi"},
    {"stream": "s1_ascending", "collection_key": S1_COLLECTION_KEY, "recipe_key": RECIPE_KEY_ASCENDING,
     "features": ["s1_vv", "s1_vh"], "primary_feature": "s1_vv"},
    {"stream": "s1_descending", "collection_key": S1_COLLECTION_KEY, "recipe_key": RECIPE_KEY_DESCENDING,
     "features": ["s1_vv", "s1_vh"], "primary_feature": "s1_vv"},
]

ASSETS = ["Epor", "Zulia", "Musamya", "Sekazinga", "Buwaiswa", "Ongom", "Nonve", "Budongo"]


def _entity_and_world(db, aoi_version_id):
    row = db.execute(
        select(s.aoi_version.c.world_id, s.aoi.c.geometry_owner_entity_id)
        .select_from(s.aoi_version.join(s.aoi, s.aoi_version.c.aoi_id == s.aoi.c.id))
        .where(s.aoi_version.c.id == aoi_version_id)
    ).one()
    return str(row.geometry_owner_entity_id), str(row.world_id)


def _real_series(db, *, aoi_version_id, recipe_key, feature_key):
    """Real, chronological (window_start, window_end, eo_observation_id,
    value, usable_observation_fraction) rows for one CFR/stream/feature --
    no interpolation, no fabricated points.
    """
    rows = db.execute(
        text(
            """
            SELECT j.window_start, j.window_end, j.eo_observation_id,
                   fv.value, o.usable_observation_fraction
            FROM processing.eo_job j
            JOIN observations.eo_observation o ON o.id = j.eo_observation_id
            JOIN observations.eo_feature_set fs ON fs.eo_observation_id = o.id
            JOIN observations.eo_feature_value fv ON fv.eo_feature_set_id = fs.id AND fv.feature_key = :feature_key
            WHERE j.aoi_version_id = :aoi_version_id AND j.recipe_key = :recipe_key AND j.status = 'succeeded'
            ORDER BY j.window_start
            """
        ),
        {"aoi_version_id": aoi_version_id, "recipe_key": recipe_key, "feature_key": feature_key},
    ).mappings().all()
    return rows


def _run_stream_feature(db, *, entity_id, world_id, aoi_version_id, stream, collection_key, recipe_key, feature_key):
    rows = _real_series(db, aoi_version_id=aoi_version_id, recipe_key=recipe_key, feature_key=feature_key)
    if len(rows) < 3:
        return {"feature_key": feature_key, "skipped": "fewer_than_3_real_months", "months": len(rows)}

    points = [
        SeriesPoint(
            date=row["window_start"],
            value=float(row["value"]),
            support_fraction=float(row["usable_observation_fraction"])
            if row["usable_observation_fraction"] is not None
            else None,
        )
        for row in rows
    ]
    method_results = run_methods(points, min_support_fraction=MIN_SUPPORT_FRACTION)

    created_candidates = []
    for method_key, outcome in method_results.items():
        if outcome["skipped"] or not outcome["result"].detected:
            continue
        result = outcome["result"]
        change_index = result.change_index
        usable_rows = [
            row for row, p in zip(rows, points, strict=True)
            if p.support_fraction is None or p.support_fraction >= MIN_SUPPORT_FRACTION
        ]
        if change_index is None or change_index >= len(usable_rows):
            continue
        baseline_rows = usable_rows[:change_index]
        candidate_rows = usable_rows[change_index:]
        if not baseline_rows or not candidate_rows:
            continue
        # Two different historical ingestion scripts used slightly different
        # month-window conventions (one computed window_end as the last day
        # of the month, the current one as the first day of the next month)
        # -- a real, discovered data-provenance inconsistency, not something
        # this experiment script should silently paper over by rewriting
        # historical eo_job rows. Bounding the baseline window's end by the
        # candidate window's start keeps the DB's baseline<=candidate CHECK
        # constraint honest without assuming either convention.
        baseline_window_end = min(baseline_rows[-1]["window_end"], candidate_rows[0]["window_start"])
        support_values = [
            float(r["usable_observation_fraction"]) for r in usable_rows if r["usable_observation_fraction"] is not None
        ]
        candidate = create_change_candidate(
            db,
            entity_id=entity_id,
            aoi_version_id=aoi_version_id,
            world_id=world_id,
            sensor_stream=stream,
            features=[feature_key],
            baseline_window=(baseline_rows[0]["window_start"], baseline_window_end),
            candidate_window=(candidate_rows[0]["window_start"], candidate_rows[-1]["window_end"]),
            algorithm=result.algorithm,
            algorithm_version=result.algorithm_version,
            config_version="1",
            statistic=result.statistic,
            persistence=result.persistence,
            common_support_fraction=(sum(support_values) / len(support_values)) if support_values else None,
            baseline_acquisition_count=len(baseline_rows),
            candidate_acquisition_count=len(candidate_rows),
            method_config={"min_support_fraction": MIN_SUPPORT_FRACTION},
            baseline_observation_ids=[str(r["eo_observation_id"]) for r in baseline_rows],
            candidate_observation_ids=[str(r["eo_observation_id"]) for r in candidate_rows],
            metadata={"notes": result.notes},
        )
        created_candidates.append(
            {
                "method": method_key,
                "change_candidate_id": candidate["id"],
                "candidate_window_start": candidate["candidate_window_start"].isoformat(),
                "statistic": result.statistic,
                "persistence": result.persistence,
            }
        )
    return {
        "feature_key": feature_key,
        "skipped": None,
        "months": len(rows),
        "method_summary": {
            k: (v["result"].__dict__ if not v["skipped"] else {"skipped": v["skipped"]}) for k, v in method_results.items()
        },
        "created_candidates": created_candidates,
    }


def main() -> None:
    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    report = {}

    with Session(engine) as db:
        cohort = load_cohort(db, country="UG", cohort_key="uganda-cfr-observation-cohort", definition_version="v1")
        db.commit()

        for asset in ASSETS:
            aoi_version_id = cohort.get(asset)
            if aoi_version_id is None:
                report[asset] = {"error": "not in frozen cohort"}
                continue
            entity_id, world_id = _entity_and_world(db, aoi_version_id)
            db.commit()

            asset_report = {"streams": {}}
            stream_primary_candidate = {}
            for stream_spec in STREAMS:
                stream_report = {}
                for feature_key in stream_spec["features"]:
                    db.begin()
                    try:
                        result = _run_stream_feature(
                            db,
                            entity_id=entity_id,
                            world_id=world_id,
                            aoi_version_id=aoi_version_id,
                            stream=stream_spec["stream"],
                            collection_key=stream_spec["collection_key"],
                            recipe_key=stream_spec["recipe_key"],
                            feature_key=feature_key,
                        )
                        db.commit()
                    except Exception as exc:  # noqa: BLE001 - one feature's failure must not abort the run
                        db.rollback()
                        result = {"feature_key": feature_key, "skipped": f"error: {exc}"}
                    stream_report[feature_key] = result
                    if feature_key == stream_spec["primary_feature"] and result.get("created_candidates"):
                        stream_primary_candidate[stream_spec["stream"]] = result["created_candidates"][0]
                asset_report["streams"][stream_spec["stream"]] = stream_report

            # Cross-sensor corroboration using each stream's primary-feature vote.
            detected_streams = list(stream_primary_candidate.keys())
            if detected_streams:
                candidate_dates = [
                    datetime.fromisoformat(stream_primary_candidate[st]["candidate_window_start"])
                    for st in detected_streams
                ]
                earliest, latest = min(candidate_dates), max(candidate_dates)
                if len(detected_streams) == 1:
                    state = {
                        "s2_optical": "OPTICAL_ONLY",
                        "s1_ascending": "SAR_ASC_ONLY",
                        "s1_descending": "SAR_DESC_ONLY",
                    }[detected_streams[0]]
                    offset_days = 0.0
                else:
                    offset_days = (latest - earliest).days
                    state = "MULTI_SENSOR_SUPPORTED" if offset_days <= 31 else "SENSOR_DISAGREEMENT"
                db.begin()
                corroboration = create_cross_sensor_corroboration(
                    db,
                    entity_id=entity_id,
                    aoi_version_id=aoi_version_id,
                    world_id=world_id,
                    reference_window=(earliest, latest + timedelta(days=31)),
                    state=state,
                    member_change_candidate_ids=[
                        stream_primary_candidate[st]["change_candidate_id"] for st in detected_streams
                    ],
                    max_temporal_offset_days=offset_days,
                )
                db.commit()
                asset_report["corroboration"] = {"state": state, "offset_days": offset_days, "id": corroboration["id"]}
            else:
                asset_report["corroboration"] = {"state": "INSUFFICIENT_EVIDENCE_OR_NO_CANDIDATE"}

            report[asset] = asset_report
            print(f"{asset}: corroboration={asset_report['corroboration']}", flush=True)

    out_path = Path(__file__).resolve().parents[2] / "outputs" / "eo" / "real_change_experiments_uganda.json"
    out_path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
