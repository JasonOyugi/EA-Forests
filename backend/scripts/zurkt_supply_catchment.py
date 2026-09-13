"""Real Uganda CFR supply catchment for the Zurkt/Evergreen Supply
Intelligence reference case (Track G1/G2/G3, then superseded by the
Evergreen-identity calibration sprint).

Two processor definitions are supported, selected by --processor. Never
overwrite one scenario's output with the other's -- pass distinct
--output paths (see Usage).

  "jinja-v1" (ZURKT_SCENARIO_PROCESSOR_V1, legacy, epistemic_class
  SCENARIO): a placeholder location with NO real-world evidence at all --
  chosen only because it produced a rich nearby CFR catchment. Preserved
  for reproducibility of the v1 analysis; no longer the primary case.

  "evergreen-mpigi-v2" (EVERGREEN_MPIGI_PROCESSOR, default,
  epistemic_class REPORTED): a real, independently-verified plywood/
  veneer manufacturer, Evergreen Wood Industries Ltd, Mpigi District,
  Uganda. Verified 2026-09-13 via three independent sources: (1) Uganda
  NEMA environmental record naming the exact factory address (Block 116,
  Plot 49, Sekiwunga Village, Nakirebe Parish, Kiringente Subcounty,
  Mpigi District); (2) NBD Trade Data customs records (real export
  shipments, product "EUCALYPTUS VENEER" HS 44083900, registered address
  "MPIGI MAWOKOTA NORTH KIRINGENTE ... NAKIREBA ... MPIGI" -- matches the
  NEMA address); (3) the same NBD customs records name "SHANDONG ZURKT
  INTERNATIONAL TRADING CO LTD" (Linyi, China) as one of Evergreen's
  documented trading partners -- a real, evidenced TRADE relationship.
  What is NOT independently confirmed: any OWNERSHIP/subsidiary
  relationship between Zurkt Group and Evergreen Wood Industries. Zurkt's
  own published company history/about pages (zurkt.com) name Uganda
  generically as a country with "production bases and trading companies"
  but never explicitly name Evergreen Wood Industries as their subsidiary,
  and no independent source states Zurkt owns or controls it -- treat
  "Zurkt Uganda" as an alias reflecting a real trade relationship, not a
  confirmed corporate structure. "Omega Online" (also named in the
  group's public materials) has only a weak, circumstantial lead (a
  "sc02omega@zurkt.com" contact address) and is not represented as a
  physical demand node here.
  Coordinates reuse this repo's pre-existing "Evergreen wood" processor
  entry in app/services/roundwood_production.py (lon 32.4077845, lat
  0.258846), which predates this verification and was not itself
  re-surveyed -- treat precision as +/- a few km (subcounty-level), not a
  surveyed point.

Everything else in this script's output IS real regardless of which
--processor is selected: it queries the operational canonical database
(ea_forests_uganda_country_pass; see
docs/architecture/CANONICAL_DATABASE_RUNTIME.md) for every real,
polygon-backed, promoted Uganda CFR AOI, computes real distance from the
selected processor location, and reports each CFR's real EO observation
coverage already produced by the active Uganda country pass.

Usage:
    uv run python scripts/zurkt_supply_catchment.py --processor evergreen-mpigi-v2 \
        --output ../outputs/supply/evergreen-uganda-catchment-v2.json \
        --expected-database ea_forests_uganda_country_pass

    uv run python scripts/zurkt_supply_catchment.py --processor jinja-v1 \
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

# Legacy placeholder -- no real-world evidence, preserved for
# reproducibility only. See module docstring.
ZURKT_SCENARIO_PROCESSOR_V1 = {
    "display_name": "Zurkt Uganda",
    "epistemic_class": "SCENARIO",
    "location_basis": (
        "Scenario location (Jinja industrial area, Uganda) -- no real Zurkt "
        "processor facts (address, capacity, species, price) exist in this "
        "repository or its history. Chosen for catchment richness, not "
        "evidence. Superseded by evergreen-mpigi-v2; kept only for v1 "
        "reproducibility."
    ),
    "lat": 0.4479,
    "lon": 33.2026,
}

# Evidence-backed v2 identity. See module docstring for the full
# verification chain and its explicit limits (trade relationship
# confirmed; ownership/subsidiary relationship NOT confirmed).
EVERGREEN_MPIGI_PROCESSOR = {
    "display_name": "Evergreen Wood Industries Ltd (Zurkt-affiliated trade partner)",
    "canonical_name": "Evergreen Wood Industries Ltd",
    "alias": "Zurkt Uganda",
    "epistemic_class": "REPORTED",
    "location_basis": (
        "Real, independently-verified plywood/veneer manufacturer, Mpigi District, "
        "Uganda (Block 116, Plot 49, Sekiwunga Village, Nakirebe Parish, Kiringente "
        "Subcounty -- Uganda NEMA record; address independently corroborated by NBD "
        "Trade Data customs registration). Coordinates reused from this repo's "
        "pre-existing app/services/roundwood_production.py 'Evergreen wood' entry, "
        "not independently re-surveyed -- treat as subcounty-level precision (+/- a "
        "few km), not a surveyed point."
    ),
    "group_relationship_basis": (
        "NBD Trade Data customs records name 'SHANDONG ZURKT INTERNATIONAL TRADING CO "
        "LTD' (Linyi, China) as a documented trading partner of Evergreen Wood "
        "Industries Ltd -- a real, evidenced TRADE relationship, verified 2026-09-13. "
        "An OWNERSHIP/subsidiary relationship between Zurkt Group and Evergreen Wood "
        "Industries is NOT independently confirmed: Zurkt's own published company "
        "history names Uganda only generically as a country with production bases, "
        "never explicitly naming Evergreen Wood Industries as its subsidiary. "
        "'Omega Online' is not represented as a physical demand node here -- its only "
        "lead is a circumstantial 'sc02omega@zurkt.com' contact address, not confirmed "
        "as Uganda-related."
    ),
    "product_evidence": (
        "Real, independently-verified export records (NBD Trade Data): 'EUCALYPTUS "
        "VENEER' (HS 44083900, 'other tropical veneer sheets/sheets for plywood'), "
        "465 trade records, 13 buyers, 12 suppliers as of the retrieval date. This is "
        "real evidence the factory processes eucalyptus specifically -- not an "
        "assumption."
    ),
    "retrieved_at": "2026-09-13",
    "lat": 0.258846,
    "lon": 32.4077845,
}

PROCESSOR_SCENARIOS = {
    "jinja-v1": ZURKT_SCENARIO_PROCESSOR_V1,
    "evergreen-mpigi-v2": EVERGREEN_MPIGI_PROCESSOR,
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
        "--processor",
        choices=sorted(PROCESSOR_SCENARIOS.keys()),
        default="evergreen-mpigi-v2",
        help="Which processor location to build the catchment around (see module docstring)",
    )
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

    processor = PROCESSOR_SCENARIOS[args.processor]

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    require_database(engine, args.expected_database, label="Zurkt/Evergreen catchment target")

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
                processor["lat"], processor["lon"], lat, lon
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
        "processor_scenario_key": args.processor,
        "processor": processor,
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
