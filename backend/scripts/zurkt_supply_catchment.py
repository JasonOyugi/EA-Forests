"""Real Uganda CFR supply catchment for the Zurkt Uganda Supply Intelligence
reference case (Track G1/G2/G3).

"Zurkt Uganda" itself is a SCENARIO placeholder -- no real Zurkt processor
exists anywhere in this repository or its history (confirmed by exhaustive
search). Its location below is an explicit, labeled assumption (Jinja's
industrial area, chosen only because it produces the richest real nearby
CFR catchment among the towns tested). Never present it as an observed
fact. See vite-version/src/app/dashboard/supply's SYNTHETIC/experiment
disclosure pattern (the same one already used for the "Shanglong" demo
processor) -- reuse it, don't invent a second one.

Everything else in this script's output IS real: it queries the
operational canonical database (ea_forests_uganda_country_pass; see
docs/architecture/CANONICAL_DATABASE_RUNTIME.md) for every real,
polygon-backed, promoted Uganda CFR AOI, computes real haversine distance
from the scenario processor location, and reports each CFR's real EO
observation coverage (sensor recipes / successful observations) already
produced by the active Uganda country pass. No stand volume, harvest
cost, or delivered-cost figure is computed here -- those require either
real field/inventory data (none exists for these forests) or an explicit,
separately-labeled scenario stand assumption layered on top of this real
catchment, which is deliberately out of scope for this script.

Usage:
    uv run python scripts/zurkt_supply_catchment.py \
        --output ../outputs/supply/zurkt-uganda-catchment.json \
        --expected-database ea_forests_uganda_country_pass
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from app.db.session import engine_for
from app.db.target_guard import add_expected_database_argument, require_database

# Explicit scenario assumption -- not a real Zurkt fact. See module docstring.
ZURKT_SCENARIO_PROCESSOR = {
    "display_name": "Zurkt Uganda",
    "epistemic_class": "SCENARIO",
    "location_basis": (
        "Scenario location (Jinja industrial area, Uganda) -- no real Zurkt "
        "processor facts (address, capacity, species, price) exist in this "
        "repository or its history. Chosen for catchment richness, not "
        "evidence."
    ),
    "lat": 0.4479,
    "lon": 33.2026,
}

DISTANCE_BANDS_KM = [25, 50, 75, 100, 150]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lmb = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(d_lmb / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--analysis-scope",
        default="uganda_cfr_commercial_eo_mvp",
        help="geo.aoi.analysis_scope to draw the candidate CFR population from",
    )
    parser.add_argument(
        "--max-distance-km",
        type=float,
        default=max(DISTANCE_BANDS_KM),
        help="Drop CFRs beyond this straight-line distance from the catchment output",
    )
    add_expected_database_argument(parser)
    args = parser.parse_args()

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    require_database(engine, args.expected_database, label="Zurkt catchment target")

    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT
                  e.id AS entity_id, e.canonical_name,
                  a.id AS aoi_id, av.id AS aoi_version_id,
                  ST_Y(ST_Centroid(go.geometry)) AS lat,
                  ST_X(ST_Centroid(go.geometry)) AS lon,
                  ST_Area(go.geometry::geography) / 10000.0 AS area_ha
                FROM geo.aoi a
                JOIN geo.aoi_version av ON av.aoi_id = a.id
                JOIN core.entity e ON e.id = a.geometry_owner_entity_id
                JOIN geo.geometry_observation go ON go.id = av.geometry_observation_id
                WHERE a.analysis_scope = :scope
                """
            ),
            {"scope": args.analysis_scope},
        ).all()

        catchment = []
        for entity_id, name, aoi_id, aoi_version_id, lat, lon, area_ha in rows:
            distance_km = haversine_km(
                ZURKT_SCENARIO_PROCESSOR["lat"], ZURKT_SCENARIO_PROCESSOR["lon"], lat, lon
            )
            if distance_km > args.max_distance_km:
                continue

            coverage = conn.execute(
                text(
                    """
                    SELECT count(DISTINCT es.recipe_key), count(eo.id)
                    FROM observations.eo_series es
                    LEFT JOIN observations.eo_observation eo
                      ON eo.series_id = es.id AND eo.outcome = 'success'
                    WHERE es.aoi_version_id = :aoi_version_id
                    """
                ),
                {"aoi_version_id": aoi_version_id},
            ).one()

            catchment.append(
                {
                    "entity_id": str(entity_id),
                    "canonical_name": name,
                    "aoi_id": str(aoi_id),
                    "aoi_version_id": str(aoi_version_id),
                    "lat": lat,
                    "lon": lon,
                    "area_ha": round(area_ha, 2),
                    "distance_km": round(distance_km, 2),
                    "eo_recipe_count": coverage[0],
                    "eo_observation_count": coverage[1],
                    "eo_evidence_status": "observed" if coverage[1] > 0 else "not_yet_processed",
                }
            )

    catchment.sort(key=lambda r: r["distance_km"])

    band_summary = []
    for band_km in DISTANCE_BANDS_KM:
        in_band = [c for c in catchment if c["distance_km"] <= band_km]
        band_summary.append(
            {
                "band_km": band_km,
                "cfr_count": len(in_band),
                "total_polygon_area_ha": round(sum(c["area_ha"] for c in in_band), 2),
                "cfrs_with_eo_evidence": sum(1 for c in in_band if c["eo_evidence_status"] == "observed"),
            }
        )

    output = {
        "processor": ZURKT_SCENARIO_PROCESSOR,
        "distance_method": "haversine_straight_line",
        "distance_method_note": (
            "Straight-line only in this pass -- road-network distance/travel "
            "time (Track G2's preferred method) is not yet computed here; "
            "backend/app/services/roundwood_production.py already has an "
            "OSRM-backed road-distance helper (nearest_processors/"
            "osrm_route) that a follow-up pass should reuse rather than "
            "reimplementing."
        ),
        "distance_bands_km": DISTANCE_BANDS_KM,
        "band_summary": band_summary,
        "source_database": engine.url.database,
        "analysis_scope": args.analysis_scope,
        "cfr_count": len(catchment),
        "cfrs": catchment,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {args.output} ({len(catchment)} CFRs within {args.max_distance_km}km)")
    for b in band_summary:
        print(
            f"  within {b['band_km']:>3}km: {b['cfr_count']:>3} CFRs, "
            f"{b['total_polygon_area_ha']:>10,.0f} ha, "
            f"{b['cfrs_with_eo_evidence']} with real EO evidence"
        )


if __name__ == "__main__":
    main()
