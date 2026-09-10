"""Real change experiments on the Uganda national history (observatory
v0.2). Sensor-native: each (stream, feature) series is analyzed
independently -- NDVI/NDMI/NBR for S2, VV/VH for S1 ascending and
descending, never fused. Only run against real, already-persisted
eo_observation/eo_feature_value rows; no synthetic data. Method minimum-
history gates are never lowered to force a result (a CFR/feature series
with <3 usable months is skipped, not padded).

config_version bumped to "2" for this pass: corroboration now uses the
corrected sensor-family/modality semantics (migration 0012), every
candidate carries an explicit evidence-quality grade (never implied by
statistic magnitude alone), and S1 candidates carry a real relative-orbit
composition confounder check. Re-running this script does not mutate
v1 candidates -- it creates new rows with config_version="2", so both
remain queryable.

Writes real processing.change_candidate rows (interpretation_class is
DB-constrained to OBSERVATION_CHANGE) and, per CFR, a single
processing.cross_sensor_corroboration comparing whether s2_optical,
s1_ascending, s1_descending independently flagged a temporally compatible
change -- using each stream's PRIMARY feature (ndvi for optical, s1_vv for
radar) as that stream's representative vote. The corroboration STATE is
derived by create_cross_sensor_corroboration from the real sensor streams
involved (migration 0012) -- this script cannot mislabel S1 ascending +
descending agreement as cross-sensor support even if it tried to.
"""

from __future__ import annotations

import json
import os
import sys
from collections import Counter
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
from app.services.eo.evidence_quality import EvidenceQualityInputs, grade_evidence
from app.services.eo.feature_registry import FEATURE_RECIPE_KEY
from app.services.eo.sar_feature_registry import RECIPE_KEY_ASCENDING, RECIPE_KEY_DESCENDING

MIN_SUPPORT_FRACTION = 0.3
CONFIG_VERSION = "2"

STREAMS = [
    {"stream": "s2_optical", "collection_key": COLLECTION_KEY, "recipe_key": FEATURE_RECIPE_KEY,
     "features": ["ndvi", "ndmi", "nbr"], "primary_feature": "ndvi"},
    {"stream": "s1_ascending", "collection_key": S1_COLLECTION_KEY, "recipe_key": RECIPE_KEY_ASCENDING,
     "features": ["s1_vv", "s1_vh"], "primary_feature": "s1_vv"},
    {"stream": "s1_descending", "collection_key": S1_COLLECTION_KEY, "recipe_key": RECIPE_KEY_DESCENDING,
     "features": ["s1_vv", "s1_vh"], "primary_feature": "s1_vv"},
]
S1_DIRECTION_BY_STREAM = {"s1_ascending": "ASCENDING", "s1_descending": "DESCENDING"}

DEFAULT_SAMPLE_PATH = Path(__file__).resolve().parents[2] / "outputs" / "eo" / "change_experiment_sample_v2.json"


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
    return db.execute(
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


def _relative_orbit_composition(db, *, aoi_version_id, direction, window_start, window_end):
    """Real per-orbit scene counts contributing to one job's window --
    read from already-persisted evidence.eo_source_item metadata, no new
    Earth Engine call.
    """
    rows = db.execute(
        text(
            """
            SELECT si.properties->>'relative_orbit' AS relative_orbit, count(*) AS n
            FROM processing.eo_job j
            JOIN processing.input inp ON inp.processing_run_id = j.processing_run_id AND inp.input_kind = 'source_item'
            JOIN evidence.eo_source_item si ON si.id = inp.eo_source_item_id
            WHERE j.aoi_version_id = :aoi_version_id AND j.collection_key = 'COPERNICUS/S1_GRD'
              AND si.properties->>'orbit_pass' = :direction
              AND j.window_start >= :window_start AND j.window_start < :window_end
            GROUP BY 1
            """
        ),
        {"aoi_version_id": aoi_version_id, "direction": direction, "window_start": window_start, "window_end": window_end},
    ).mappings().all()
    counts = {row["relative_orbit"]: row["n"] for row in rows}
    total = sum(counts.values())
    dominant = max(counts.items(), key=lambda kv: kv[1])[0] if counts else None
    return {"counts": counts, "total_scenes": total, "dominant_relative_orbit": dominant}


def _orbit_confounder(db, *, aoi_version_id, stream, baseline_rows, candidate_rows):
    """Real relative-orbit composition check for an S1 candidate (section
    2): does the dominant relative orbit differ between the baseline and
    candidate windows? Classification defaults to ORBIT_EFFECT_UNRESOLVED
    when a shift IS detected -- resolving it requires a bounded, real,
    per-candidate Earth Engine re-test (as done for Ochomil), not assumed
    from one prior case.
    """
    if stream not in S1_DIRECTION_BY_STREAM:
        return None
    direction = S1_DIRECTION_BY_STREAM[stream]
    baseline_composition = _relative_orbit_composition(
        db, aoi_version_id=aoi_version_id, direction=direction,
        window_start=baseline_rows[0]["window_start"], window_end=baseline_rows[-1]["window_end"],
    )
    candidate_composition = _relative_orbit_composition(
        db, aoi_version_id=aoi_version_id, direction=direction,
        window_start=candidate_rows[0]["window_start"], window_end=candidate_rows[-1]["window_end"],
    )
    shift_detected = (
        baseline_composition["dominant_relative_orbit"] is not None
        and candidate_composition["dominant_relative_orbit"] is not None
        and baseline_composition["dominant_relative_orbit"] != candidate_composition["dominant_relative_orbit"]
    )
    return {
        "baseline_composition": baseline_composition,
        "candidate_composition": candidate_composition,
        "composition_shift_detected": shift_detected,
        "classification": "ORBIT_EFFECT_UNRESOLVED" if shift_detected else None,
    }


def _run_stream_feature(db, *, entity_id, world_id, aoi_version_id, stream, recipe_key, feature_key):
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
        # month-window conventions (last-day-of-month vs. first-of-next-
        # month) -- capping the baseline end at the candidate start keeps
        # the DB's baseline<=candidate CHECK constraint honest without
        # rewriting historical eo_job rows.
        baseline_window_end = min(baseline_rows[-1]["window_end"], candidate_rows[0]["window_start"])
        support_values = [
            float(r["usable_observation_fraction"]) for r in usable_rows if r["usable_observation_fraction"] is not None
        ]
        common_support_fraction = (sum(support_values) / len(support_values)) if support_values else None

        confounders = {}
        unresolved_confounder_count = 0
        orbit_confounder = _orbit_confounder(
            db, aoi_version_id=aoi_version_id, stream=stream, baseline_rows=baseline_rows, candidate_rows=candidate_rows
        )
        if orbit_confounder is not None:
            confounders["relative_orbit_composition"] = orbit_confounder
            if orbit_confounder["composition_shift_detected"] and orbit_confounder["classification"] in (
                None,
                "ORBIT_EFFECT_UNRESOLVED",
                "ORBIT_SENSITIVE",
            ):
                unresolved_confounder_count += 1

        evidence = grade_evidence(
            EvidenceQualityInputs(
                baseline_acquisition_count=len(baseline_rows),
                candidate_acquisition_count=len(candidate_rows),
                post_candidate_acquisition_count=max(0, len(candidate_rows) - 1),
                persistence=result.persistence,
                common_support_fraction=common_support_fraction,
                unresolved_confounder_count=unresolved_confounder_count,
            )
        )

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
            config_version=CONFIG_VERSION,
            statistic=result.statistic,
            persistence=result.persistence,
            common_support_fraction=common_support_fraction,
            baseline_acquisition_count=len(baseline_rows),
            candidate_acquisition_count=len(candidate_rows),
            method_config={"min_support_fraction": MIN_SUPPORT_FRACTION},
            baseline_observation_ids=[str(r["eo_observation_id"]) for r in baseline_rows],
            candidate_observation_ids=[str(r["eo_observation_id"]) for r in candidate_rows],
            metadata={"notes": result.notes, "evidence_quality": evidence, "confounders": confounders},
        )
        created_candidates.append(
            {
                "method": method_key,
                "change_candidate_id": candidate["id"],
                "candidate_window_start": candidate["candidate_window_start"].isoformat(),
                "statistic": result.statistic,
                "persistence": result.persistence,
                "evidence_grade": evidence["grade"],
                "confounders": confounders,
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
    sample_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SAMPLE_PATH
    assets = json.loads(sample_path.read_text(encoding="utf-8"))
    engine = engine_for(database_url)
    report = {}
    corroboration_state_counts = Counter()

    with Session(engine) as db:
        cohort = load_cohort(db, country="UG", cohort_key="uganda-cfr-observation-cohort", definition_version="v1")
        db.commit()

        for asset in assets:
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

            # Cross-sensor corroboration using each stream's primary-feature
            # vote -- state is DERIVED by create_cross_sensor_corroboration
            # from the real sensor_stream of each member (migration 0012);
            # this script only decides temporal compatibility.
            detected_streams = list(stream_primary_candidate.keys())
            if detected_streams:
                candidate_dates = [
                    datetime.fromisoformat(stream_primary_candidate[st]["candidate_window_start"])
                    for st in detected_streams
                ]
                earliest, latest = min(candidate_dates), max(candidate_dates)
                offset_days = (latest - earliest).days
                temporally_compatible = offset_days <= 31
                db.begin()
                corroboration = create_cross_sensor_corroboration(
                    db,
                    entity_id=entity_id,
                    aoi_version_id=aoi_version_id,
                    world_id=world_id,
                    reference_window=(earliest, latest + timedelta(days=31)),
                    members=[
                        {"change_candidate_id": stream_primary_candidate[st]["change_candidate_id"], "sensor_stream": st}
                        for st in detected_streams
                    ],
                    temporally_compatible=temporally_compatible,
                    max_temporal_offset_days=offset_days,
                )
                db.commit()
                asset_report["corroboration"] = {"state": corroboration["state"], "offset_days": offset_days, "id": corroboration["id"]}
                corroboration_state_counts[corroboration["state"]] += 1
            else:
                asset_report["corroboration"] = {"state": "INSUFFICIENT_EVIDENCE_OR_NO_CANDIDATE"}
                corroboration_state_counts["INSUFFICIENT_EVIDENCE_OR_NO_CANDIDATE"] += 1

            report[asset] = asset_report
            print(f"{asset}: corroboration={asset_report['corroboration']}", flush=True)

    summary = {"assets_run": len(assets), "corroboration_state_counts": dict(corroboration_state_counts), "detail": report}
    out_path = Path(__file__).resolve().parents[2] / "outputs" / "eo" / "real_change_experiments_uganda_v2.json"
    out_path.write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"assets_run": len(assets), "corroboration_state_counts": dict(corroboration_state_counts)}, indent=2))
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
