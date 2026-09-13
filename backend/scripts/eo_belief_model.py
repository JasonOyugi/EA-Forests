"""Formal, reusable EO-conditioned belief model (Track v4-10/11/12).

Turns the ad-hoc NDVI-nudge mechanism (zurkt_eo_conditioned_priors.py) into
a versioned, explicit BELIEF OBJECT per entity/AOI, shared by:
  - Supply Intelligence's Zurkt/Evergreen catchment CFRs
  - Asset Intelligence's three reference assets (Kampimpini/Kapimpini,
    Namavundu, Mbooni South)
so there is exactly ONE belief-computation implementation, not two.

HONESTY CONSTRAINT (explicit): this is a HEURISTIC, BOUNDED-NUDGE belief
model, NOT a calibrated Bayesian update. Every belief object below carries
`update_method: "heuristic_bounded_nudge"` and a `calibrated: false` flag
for exactly this reason -- do not represent it, or let a UI represent it,
as formal Bayesian inference.

MULTI-INDEX (not yet true multi-SENSOR) evidence (Track v4-11): pulls THREE
independent Sentinel-2 derived indices per AOI from the canonical database
(observations.eo_feature_value) -- NDVI (greenness/cover), NDMI (moisture,
used here as a confound check: high NDVI with very low NDMI suggests
stressed/senescent vegetation, not simply "dense forest"), and NBR (burn
ratio, a disturbance/fire proxy). All three come from the SAME sensor
family (Sentinel-2 optical), so this is multi-INDEX, not multi-SENSOR,
conditioning -- true Sentinel-1 (radar) integration and Landsat long-history
remain a documented gap (see the sprint's own final report for what
multi-sensor work does/doesn't exist for Mabira/South Busoga/Buyaga Dam).

Variables represented (belief objects), each with prior / evidence /
conditioned distribution / confidence / update timestamp / model version:
  - forested_fraction        (conditioned by NDVI level)
  - disturbance_state        (categorical: STABLE / POSSIBLE_DISTURBANCE,
                               conditioned by NBR level and NDVI temporal CV)
  - canopy_persistence       (conditioned by NDVI temporal CV directly)
Volume/DBH/height are explicitly NOT represented here -- not model-supported
by index-level EO evidence (the sprint's own constraint).

Usage:
    uv run python scripts/eo_belief_model.py \
        --entities ../outputs/supply/evergreen-uganda-catchment-v2-routed.json \
        --output ../outputs/supply/zurkt-eo-beliefs-v4.json \
        --expected-database ea_forests_uganda_country_pass

    # Or for a small manually-specified entity list (Asset Intelligence):
    uv run python scripts/eo_belief_model.py \
        --entities-json '[{"entity_id":"...","aoi_version_id":"...","canonical_name":"Kapimpini"}]' \
        --output ../outputs/asset-intel/asset-beliefs-v1.json \
        --expected-database ea_forests_uganda_country_pass
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.db.session import engine_for
from app.db.target_guard import add_expected_database_argument, require_database

BELIEF_MODEL_VERSION = "eo-belief-heuristic-v1"
NBR_DISTURBANCE_DROP_THRESHOLD = 0.15  # ASSUMED: an NBR drop of this much between observations flags possible disturbance


def _fetch_index_series(conn, entity_ids: list[str], feature_key: str) -> dict[str, list[float]]:
    rows = conn.execute(
        text(
            """
            SELECT a.geometry_owner_entity_id AS entity_id, fv.value
            FROM geo.aoi a
            JOIN geo.aoi_version av ON av.aoi_id = a.id
            JOIN observations.eo_series es ON es.aoi_version_id = av.id
            JOIN observations.eo_observation eo ON eo.series_id = es.id AND eo.outcome = 'success'
            JOIN observations.eo_feature_set fs ON fs.eo_observation_id = eo.id
            JOIN observations.eo_feature_value fv ON fv.eo_feature_set_id = fs.id
            WHERE a.geometry_owner_entity_id = ANY(:ids)
              AND fv.feature_key = :feature_key AND fv.value_statistic = 'mean'
            ORDER BY a.geometry_owner_entity_id
            """
        ),
        {"ids": entity_ids, "feature_key": feature_key},
    ).all()
    out: dict[str, list[float]] = {}
    for entity_id, value in rows:
        out.setdefault(str(entity_id), []).append(float(value))
    return out


def build_belief_object(entity_id: str, canonical_name: str, ndvi: list[float], ndmi: list[float], nbr: list[float]) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    variables = []

    if not ndvi:
        return {
            "entity_id": entity_id,
            "canonical_name": canonical_name,
            "model_version": BELIEF_MODEL_VERSION,
            "updated_at": now,
            "calibrated": False,
            "update_method": "heuristic_bounded_nudge",
            "variables": [],
            "note": "No EO index observations found for this entity/AOI -- belief remains prior-dominated with no evidence to condition on.",
        }

    ndvi_arr = np.array(ndvi)
    ndvi_mean = float(ndvi_arr.mean())
    ndvi_cv = float(ndvi_arr.std() / ndvi_mean) if ndvi_mean > 1e-9 and len(ndvi_arr) > 1 else 0.0

    # forested_fraction: prior mean 0.75 (matches zurkt_scenario's
    # relevant_forest_fraction prior), conditioned by NDVI level only within
    # a bounded +/-15% multiplier -- never an absolute forest-cover claim.
    prior_mean = 0.75
    ndvi_z = (ndvi_mean - 0.5) / 0.2  # crude standardization around a generic tropical-vegetation NDVI midpoint
    nudge = float(np.clip(1.0 + 0.15 * np.tanh(ndvi_z), 0.85, 1.15))
    conditioned_mean = float(np.clip(prior_mean * nudge, 0.0, 1.0))
    variables.append(
        {
            "variable": "forested_fraction",
            "prior": {"kind": "beta", "mean": prior_mean, "rationale": "Matches zurkt_scenario.PRIORS['relevant_forest_fraction'] -- broad, not surveyed."},
            "evidence": {"sensor": "sentinel2", "index": "ndvi", "summary": f"mean NDVI={ndvi_mean:.3f} across {len(ndvi)} observations"},
            "update_method": "heuristic_bounded_nudge",
            "conditioned": {"mean": round(conditioned_mean, 4), "multiplier_applied": round(nudge, 4)},
            "confidence": "evidence_constrained" if len(ndvi) >= 6 else "prior_dominated",
            "updated_at": now,
            "model_version": BELIEF_MODEL_VERSION,
        }
    )

    # canopy_persistence: directly the inverse of NDVI temporal CV -- a
    # genuinely EO-native quantity (not a volume/DBH proxy), reported as its
    # own belief rather than folded silently into another variable.
    persistence = float(np.clip(1.0 - ndvi_cv * 2, 0.0, 1.0))
    variables.append(
        {
            "variable": "canopy_persistence",
            "prior": {"kind": "point", "mean": None, "rationale": "No prior -- this is an EO-native derived quantity, not a physical prior being conditioned."},
            "evidence": {"sensor": "sentinel2", "index": "ndvi_temporal_cv", "summary": f"NDVI coefficient of variation across {len(ndvi)} monthly observations = {ndvi_cv:.3f}"},
            "update_method": "direct_eo_derived_index",
            "conditioned": {"persistence_score_0to1": round(persistence, 4)},
            "confidence": "evidence_constrained" if len(ndvi) >= 6 else "prior_dominated",
            "updated_at": now,
            "model_version": BELIEF_MODEL_VERSION,
        }
    )

    # disturbance_state: categorical, conditioned by NBR level/drop AND high
    # NDVI temporal CV as a secondary corroborating signal -- never derived
    # from NDVI alone.
    disturbance_state = "UNKNOWN"
    nbr_note = "No NBR observations available."
    nbr_evidence_constrained = False
    if len(nbr) >= 2:
        nbr_arr = np.array(nbr)
        nbr_drop = float(nbr_arr.max() - nbr_arr.min())
        if nbr_drop >= NBR_DISTURBANCE_DROP_THRESHOLD and ndvi_cv > 0.15:
            disturbance_state = "POSSIBLE_DISTURBANCE"
        else:
            disturbance_state = "STABLE"
        nbr_note = f"max-min NBR range across {len(nbr)} observations = {nbr_drop:.3f} (flag threshold {NBR_DISTURBANCE_DROP_THRESHOLD})"
        nbr_evidence_constrained = True
    elif len(nbr) == 1:
        nbr_note = "Only 1 NBR observation available -- cannot compute a range, so no disturbance signal either way."
    variables.append(
        {
            "variable": "disturbance_state",
            "prior": {"kind": "categorical", "states": ["STABLE", "POSSIBLE_DISTURBANCE", "UNKNOWN"], "rationale": "No prior belief -- purely evidence-driven categorical flag."},
            "evidence": {"sensor": "sentinel2", "index": "nbr+ndvi_temporal_cv", "summary": nbr_note},
            "update_method": "heuristic_threshold_flag",
            "conditioned": {"state": disturbance_state},
            "confidence": "evidence_constrained" if nbr_evidence_constrained else "prior_dominated",
            "updated_at": now,
            "model_version": BELIEF_MODEL_VERSION,
        }
    )

    if ndmi:
        ndmi_mean = float(np.mean(ndmi))
        variables.append(
            {
                "variable": "moisture_confound_check",
                "prior": {"kind": "point", "mean": None, "rationale": "Diagnostic only -- checks whether NDVI-based greenness could be misread against a moisture-stressed canopy."},
                "evidence": {"sensor": "sentinel2", "index": "ndmi", "summary": f"mean NDMI={ndmi_mean:.3f} across {len(ndmi)} observations"},
                "update_method": "direct_eo_derived_index",
                "conditioned": {"note": "low NDMI alongside high NDVI would flag a stressed-canopy misread; not automatically applied as a correction"},
                "confidence": "evidence_constrained",
                "updated_at": now,
                "model_version": BELIEF_MODEL_VERSION,
            }
        )

    return {
        "entity_id": entity_id,
        "canonical_name": canonical_name,
        "model_version": BELIEF_MODEL_VERSION,
        "updated_at": now,
        "calibrated": False,
        "update_method": "heuristic_bounded_nudge",
        "variables": variables,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--entities", type=Path, default=None, help="A catchment-shaped JSON with a 'cfrs' list of {entity_id, canonical_name}")
    parser.add_argument("--entities-json", type=str, default=None, help="Inline JSON list of {entity_id, canonical_name} (for a small ad-hoc entity set)")
    parser.add_argument("--output", required=True, type=Path)
    add_expected_database_argument(parser)
    args = parser.parse_args()

    if args.entities:
        data = json.loads(args.entities.read_text(encoding="utf-8"))
        entities = [{"entity_id": c["entity_id"], "canonical_name": c["canonical_name"]} for c in data["cfrs"]]
    elif args.entities_json:
        entities = json.loads(args.entities_json)
    else:
        raise SystemExit("Provide --entities or --entities-json")

    entity_ids = [e["entity_id"] for e in entities]

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    require_database(engine, args.expected_database, label="EO belief model target")

    with engine.connect() as conn:
        ndvi_by_entity = _fetch_index_series(conn, entity_ids, "ndvi")
        ndmi_by_entity = _fetch_index_series(conn, entity_ids, "ndmi")
        nbr_by_entity = _fetch_index_series(conn, entity_ids, "nbr")

    beliefs = []
    for e in entities:
        beliefs.append(
            build_belief_object(
                e["entity_id"],
                e["canonical_name"],
                ndvi_by_entity.get(e["entity_id"], []),
                ndmi_by_entity.get(e["entity_id"], []),
                nbr_by_entity.get(e["entity_id"], []),
            )
        )

    output = {
        "model_version": BELIEF_MODEL_VERSION,
        "method": (
            "Heuristic, bounded-nudge belief conditioning from real Sentinel-2 derived indices (NDVI/NDMI/NBR) "
            "in observations.eo_feature_value. NOT a calibrated Bayesian update -- every belief object carries "
            "calibrated=false. Multi-INDEX (three Sentinel-2 products), not yet multi-SENSOR (no Sentinel-1 "
            "radar or Landsat integration in this model version)."
        ),
        "entities": beliefs,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")
    n_with_evidence = sum(1 for b in beliefs if b["variables"])
    print(f"Wrote {args.output} ({len(beliefs)} entities, {n_with_evidence} with real EO evidence)")


if __name__ == "__main__":
    main()
