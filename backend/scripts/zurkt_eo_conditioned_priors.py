"""EO-conditioned CFR priors (Track v3-10).

Uses REAL per-CFR NDVI time series already in the canonical database
(observations.eo_feature_value, feature_key='ndvi', value_statistic='mean'
-- monthly Sentinel-2 observations from the Uganda country pass, present
for all 276 catchment CFRs, confirmed by direct query) to differentiate
CFR priors WITHOUT mapping NDVI directly to standing volume in m3 (an
explicit sprint constraint). Two real, defensible signals are extracted
per CFR:

  ndvi_level     -- mean NDVI across all available months. A vegetation-
                    greenness/cover proxy, used ONLY to nudge the
                    forested/stocked-cover fraction's mean up or down
                    relative to the catchment population, never to set an
                    absolute value and never to imply a species or volume
                    reading.
  ndvi_temporal_cv -- coefficient of variation of NDVI across months for
                    that CFR. A rough persistence/disturbance proxy (a
                    CFR whose canopy signal swings around a lot month to
                    month is less likely to be a stable, undisturbed
                    mature stand than one that doesn't) -- used ONLY to
                    nudge the maturity fraction DOWN (never up), since
                    instability is not evidence of MORE maturity.

Both nudges are bounded multipliers (+/-15% forest-cover, up to -20%
maturity) applied on TOP of the existing CFR-specific/regional/global
tiers in zurkt_scenario.py -- a real but modest evidence-conditioning
layer, not a replacement for the underlying broad priors. This is
explicitly NOT a full belief object (no posterior distribution family
change, no formal Bayesian update) -- see the final report for what a
fuller EO-conditioned belief layer would still require.

Usage:
    uv run python scripts/zurkt_eo_conditioned_priors.py \
        --catchment ../outputs/supply/evergreen-uganda-catchment-v2-routed.json \
        --output ../outputs/supply/zurkt-eo-conditioned-priors-v3.json \
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

FOREST_COVER_NUDGE_MAX = 0.15  # +/-15% multiplicative bound
MATURITY_NUDGE_MAX = 0.20  # up to -20% (never positive) multiplicative bound


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catchment", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    add_expected_database_argument(parser)
    args = parser.parse_args()

    catchment = json.loads(args.catchment.read_text(encoding="utf-8"))
    entity_ids = [c["entity_id"] for c in catchment["cfrs"]]

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    require_database(engine, args.expected_database, label="Zurkt EO-conditioned-priors target")

    with engine.connect() as conn:
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
                  AND fv.feature_key = 'ndvi' AND fv.value_statistic = 'mean'
                """
            ),
            {"ids": entity_ids},
        ).all()

    by_entity: dict[str, list[float]] = {}
    for entity_id, value in rows:
        by_entity.setdefault(str(entity_id), []).append(float(value))

    import numpy as np

    stats = {}
    for entity_id, values in by_entity.items():
        arr = np.array(values)
        mean = float(arr.mean())
        cv = float(arr.std() / mean) if mean > 1e-9 and len(arr) > 1 else 0.0
        stats[entity_id] = {"ndvi_level": mean, "ndvi_temporal_cv": cv, "n_observations": len(arr)}

    levels = np.array([s["ndvi_level"] for s in stats.values()]) if stats else np.array([0.0])
    cvs = np.array([s["ndvi_temporal_cv"] for s in stats.values()]) if stats else np.array([0.0])

    def _percentile_rank(x: float, population: np.ndarray) -> float:
        return float((population <= x).mean()) if len(population) else 0.5

    out_rows = []
    for cfr in catchment["cfrs"]:
        entity_id = cfr["entity_id"]
        s = stats.get(entity_id)
        if s is None:
            out_rows.append(
                {
                    "entity_id": entity_id,
                    "canonical_name": cfr["canonical_name"],
                    "eo_evidence": None,
                    "forest_cover_multiplier": 1.0,
                    "maturity_multiplier": 1.0,
                    "rationale": "No ndvi feature values found for this CFR -- no nudge applied (multiplier 1.0).",
                }
            )
            continue
        level_pct = _percentile_rank(s["ndvi_level"], levels)
        cv_pct = _percentile_rank(s["ndvi_temporal_cv"], cvs)
        forest_cover_multiplier = round(1.0 + FOREST_COVER_NUDGE_MAX * (level_pct - 0.5) * 2, 4)
        maturity_multiplier = round(1.0 - MATURITY_NUDGE_MAX * cv_pct, 4)  # only ever <= 1.0
        out_rows.append(
            {
                "entity_id": entity_id,
                "canonical_name": cfr["canonical_name"],
                "eo_evidence": {
                    "ndvi_level_mean": round(s["ndvi_level"], 4),
                    "ndvi_level_percentile_in_catchment": round(level_pct, 3),
                    "ndvi_temporal_cv": round(s["ndvi_temporal_cv"], 4),
                    "ndvi_temporal_cv_percentile_in_catchment": round(cv_pct, 3),
                    "n_observations": s["n_observations"],
                },
                "forest_cover_multiplier": forest_cover_multiplier,
                "maturity_multiplier": maturity_multiplier,
                "rationale": (
                    f"forest_cover_multiplier nudges relevant/stocked-fraction mean by up to +/-{int(FOREST_COVER_NUDGE_MAX*100)}% "
                    "based on this CFR's real NDVI-level percentile within the 276-CFR catchment (higher persistent greenness "
                    "-> modest upward nudge, not an absolute cover estimate). maturity_multiplier only ever reduces (never raises) "
                    f"the maturity fraction, by up to {int(MATURITY_NUDGE_MAX*100)}%, when this CFR's month-to-month NDVI is unusually "
                    "unstable relative to the catchment (a disturbance/persistence proxy, not a direct age-class reading). Neither "
                    "multiplier maps NDVI to standing volume in m3."
                ),
            }
        )

    output = {
        "method": (
            "Real per-CFR NDVI time series from observations.eo_feature_value (Sentinel-2, Uganda country pass) "
            "converted into two bounded multiplicative nudges applied on top of the existing CFR-specific/"
            "regional/global priors in zurkt_scenario.py -- see module docstring for the exact, deliberately "
            "modest bounds and the reasoning against directly mapping NDVI to m3."
        ),
        "forest_cover_nudge_max_pct": FOREST_COVER_NUDGE_MAX * 100,
        "maturity_nudge_max_pct": MATURITY_NUDGE_MAX * 100,
        "cfrs": out_rows,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {args.output} ({len(out_rows)} CFRs, {sum(1 for r in out_rows if r['eo_evidence'])} with real NDVI evidence)")


if __name__ == "__main__":
    main()
