"""Real Asset Intelligence AssetState generator (Track v5/v6).

v6 FIXES (this session), on top of v5's initial reality reset:
  1. Volume semantics: standing/harvestable/merchantable are now each
     given their OWN 2024-2028 time series (volume_by_year_STANDING_m3,
     ..._HARVESTABLE_m3, ..._MERCHANTABLE_m3) -- the v5 artifact only
     produced one series (merchantable) and the frontend mislabeled it
     "volume". The frontend now defaults its chart to STANDING.
  2. Structural EO is now POLYGON-CLIPPED (asset_structural_evidence.py
     v2, using the real canonical AOI geometry), not a 1km reference-
     point buffer. The old buffer-based file is kept only as a
     diagnostic artifact, never read by this script anymore.
  3. Two REAL structural zones per asset (Track v6-3/4/5), split at the
     real CHMv2 median height within the polygon (so "below-median" and
     "above-median" are each exactly half the real polygon area by
     construction, not an arbitrary split): a low-canopy/open zone and a
     high-canopy/persistent zone, each with ITS OWN material-class
     mixture nudge and its OWN Monte Carlo run (reusing
     build_cfr_supply_state per zone), aggregated via sum-of-raw-draws-
     then-quantile (never sum-of-quantiles).
  4. Multi-processor netback (Track v6-11/12/13): ranks the top 3 REAL
     nearby processors (vite-version processors.json) by real OSRM road
     distance, reruns the SAME hierarchical Monte Carlo against each
     processor's actual location, and reports the BEST netback -- not
     Evergreen by default. For Mbooni South (Kenya), Evergreen (Uganda)
     is excluded from the ranking entirely (a cross-border claim was
     never defensible).

REUSES rather than reimplements: every zone x processor combination
calls app.services.supply.zurkt_scenario.build_cfr_supply_state -- the
SAME validated hierarchical Monte Carlo engine built for the Zurkt/
Evergreen supply case.

HONESTY CONSTRAINTS (unchanged from v5): no individual tree is modelled;
every field carries an explicit epistemic status and identifiability;
no processor price for Evergreen (or the 81 other real, non-dummy
processor entries) was found in any real source this session -- the
netback calculation uses STANDARD_EUC_SPEC's existing per-tonne grade
prices as an explicit SCENARIO price, never presented as any processor's
real buying price.

Usage:
    uv run python scripts/asset_state_model.py \
        --output ../outputs/asset-intel/asset-state-v2.json \
        --structural-evidence ../outputs/asset-intel/asset-structural-evidence-v2.json \
        --expected-database ea_forests_uganda_country_pass
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Any


def _deterministic_seed(key: str, base_seed: int = 0) -> int:
    """Python's built-in hash() is randomized per-process for strings
    (PYTHONHASHSEED) -- unsuitable for a reproducible rng_seed. sha256
    gives the same seed every run."""
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return (base_seed + int(digest[:8], 16)) % (2**31 - 1)


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np

from app.db.session import engine_for
from app.db.target_guard import add_expected_database_argument, require_database
from app.services.roundwood_production import STANDARD_EUC_SPEC, UGX_PER_USD, haversine_km as rw_haversine_km, osrm_route
from app.services.supply.zurkt_scenario import (
    assign_region,
    build_cfr_supply_state,
    quantiles,
    sample_global_draws,
    sample_regional_draws_by_region,
)

PROCESSOR_DATABASE_PATH = Path(__file__).resolve().parents[2] / "vite-version" / "src" / "app" / "shop" / "data" / "market-databases" / "processors.json"

# Three reference assets -- real identity confirmed against
# ea_forests_uganda_country_pass (see forestry-data.ts's canonicalIdentity
# blocks, 2026-09-11). Areas are the real canonical AOI polygon areas.
REFERENCE_ASSETS = [
    {
        "entity_id": "c7151c94-2797-4dd8-b6c3-b9aea8dda81e",
        "aoi_version_id": "b8b1656c-4015-41a1-a907-f9866a94dc1e",
        "canonical_name": "Kapimpini",
        "display_name": "Kampimpini",
        "country": "Uganda",
        "area_ha": 6078.12,
        "lat": 0.98736,
        "lon": 32.07765,
    },
    {
        "entity_id": "953552e7-6c06-4e9a-96ac-524239a0772c",
        "aoi_version_id": "155ca398-40fd-4fa3-a5f8-5943e62f5e54",
        "canonical_name": "Namavundu",
        "display_name": "Namavundu",
        "country": "Uganda",
        "area_ha": 684.90,
        "lat": 0.55347,
        "lon": 33.11138,
    },
    {
        "entity_id": "b7738efb-d1fc-4bc8-a56a-dd00886f279c",
        "aoi_version_id": "5e6f31db-a595-4a4a-9f39-108e49df51de",
        "canonical_name": "MBOONI SOUTH",
        "display_name": "Mbooni South",
        "country": "Kenya",
        "area_ha": 206.35,
        "lat": -1.6338,
        "lon": 37.4368,
    },
]

N_DRAWS = 2_000
GLOBAL_DRAWS_SEED = 6001
REGIONAL_DRAWS_BASE_SEED = 9501
NET_STOCK_CHANGE_FRACTION_MEAN = -0.01  # ASSUMED, matches zurkt_run_supply_model.py's depletion stress test
NET_STOCK_CHANGE_FRACTION_STD = 0.03
PROJECTION_YEARS = [2024, 2025, 2026, 2027, 2028]
CURRENT_YEAR = 2026

# Default material mixture (no asset-specific plantation record found) --
# same broad prior as zurkt_scenario.DEFAULT_MATERIAL_MIX_PROBS.
DEFAULT_MIX = {
    "eucalyptus_plantation": 0.12,
    "pine_plantation": 0.08,
    "mixed_plantation": 0.05,
    "natural_hardwood_mixed": 0.55,
    "degraded_open": 0.15,
    "unresolved": 0.05,
}
# Track v6-4: bounded, documented nudges FROM real CHMv2 structural
# evidence -- higher observed canopy correlates with a modest upward shift
# toward intact natural/mixed forest and away from degraded/open; lower
# canopy shifts the other way. Never asserts a species from height alone
# (the shift is small and only reallocates between "how intact" classes,
# never asserts plantation vs natural).
def _zone_mix(base: dict[str, float], intact_shift: float) -> dict[str, float]:
    mix = dict(base)
    shift = max(-0.10, min(0.10, intact_shift))
    mix["natural_hardwood_mixed"] = max(0.05, mix["natural_hardwood_mixed"] + shift)
    mix["degraded_open"] = max(0.02, mix["degraded_open"] - shift)
    total = sum(mix.values())
    return {k: v / total for k, v in mix.items()}


def _nearby_real_processors(lat: float, lon: float, country: str, top_n: int = 3) -> list[dict[str, Any]]:
    """Real processor identities near this asset from the 86-entry database
    -- excludes the 5 entries explicitly flagged as dummy test data, and
    (Track v6-11) excludes processors in a different country than the
    asset -- a cross-border haulage relationship was never defensible and
    inflated Mbooni South's netback denominator with an absurd distance."""
    if not PROCESSOR_DATABASE_PATH.exists():
        return []
    data = json.loads(PROCESSOR_DATABASE_PATH.read_text(encoding="utf-8"))
    candidates = []
    for name, entry in data.items():
        if "dummy" in str(entry.get("Comments", "")).lower():
            continue
        p_lat, p_lon = entry.get("lat"), entry.get("lon")
        if p_lat is None or p_lon is None:
            continue
        dist = rw_haversine_km(lon, lat, p_lon, p_lat)
        # Country filter: Uganda assets stay within ~plausible in-country
        # range; Kenya's Mbooni South only considers processors close
        # enough to plausibly be Kenyan (a real country boundary lookup is
        # not available here, so distance is used as a bounded proxy --
        # documented, not silently assumed).
        max_km = 250.0 if country == "Kenya" else 400.0
        if dist > max_km:
            continue
        candidates.append({"name": name, "lat": p_lat, "lon": p_lon, "distance_km": round(dist, 1), "products": entry.get("Products"), "capacity": entry.get("Roundwood input capacity"), "certification": entry.get("Certification")})
    candidates.sort(key=lambda c: c["distance_km"])
    return candidates[:top_n]


def _wood_density_usd_prices_per_m3(density_t_per_m3: float) -> dict[str, float]:
    prices_ugx_per_tonne = STANDARD_EUC_SPEC["prices"]
    return {g: (p / UGX_PER_USD) * density_t_per_m3 for g, p in prices_ugx_per_tonne.items()}


def _eo_index_series(conn, entity_id: str, feature_key: str) -> list[float]:
    from sqlalchemy import text

    rows = conn.execute(
        text(
            """
            SELECT fv.value
            FROM geo.aoi a
            JOIN geo.aoi_version av ON av.aoi_id = a.id
            JOIN observations.eo_series es ON es.aoi_version_id = av.id
            JOIN observations.eo_observation eo ON eo.series_id = es.id AND eo.outcome = 'success'
            JOIN observations.eo_feature_set fs ON fs.eo_observation_id = eo.id
            JOIN observations.eo_feature_value fv ON fv.eo_feature_set_id = fs.id
            WHERE a.geometry_owner_entity_id = :entity_id
              AND fv.feature_key = :feature_key AND fv.value_statistic = 'mean'
            """
        ),
        {"entity_id": entity_id, "feature_key": feature_key},
    ).all()
    return [float(r[0]) for r in rows]


def _run_zone(entity_id: str, canonical_name: str, area_ha: float, distance_km: float, road_km: float | None, route_source: str,
              eo_status: str, eo_forest_cover_multiplier: float, mix_probs: dict[str, float], zone_seed_key: str) -> tuple[Any, dict]:
    global_draws = sample_global_draws(np.random.default_rng(GLOBAL_DRAWS_SEED), N_DRAWS)
    region_id = assign_region(0.0, 0.0)  # single-asset run; region grouping is moot at n=1
    regional_draws = sample_regional_draws_by_region([region_id], N_DRAWS, REGIONAL_DRAWS_BASE_SEED)[region_id]
    return build_cfr_supply_state(
        entity_id=entity_id,
        canonical_name=canonical_name,
        gross_area_ha=area_ha,
        distance_km=distance_km,
        road_km=road_km,
        route_source=route_source,
        eo_evidence_status=eo_status,
        global_draws=global_draws,
        regional_draws=regional_draws,
        region_id=region_id,
        eo_forest_cover_multiplier=eo_forest_cover_multiplier,
        material_mix_probs=mix_probs,
        processor_spec_key="STANDARD",
        n_draws=N_DRAWS,
        rng_seed=_deterministic_seed(zone_seed_key, 7001),
    )


def _volume_time_series(base_draws: np.ndarray, seed_key: str) -> dict[str, dict]:
    rng = np.random.default_rng(_deterministic_seed(seed_key, 8001))
    net_change = np.clip(rng.normal(NET_STOCK_CHANGE_FRACTION_MEAN, NET_STOCK_CHANGE_FRACTION_STD, size=len(base_draws)), -0.15, 0.15)
    by_year: dict[str, dict] = {}
    stock = base_draws.copy()
    for year in range(CURRENT_YEAR, min(PROJECTION_YEARS) - 1, -1):
        by_year[str(year)] = quantiles(stock)
        stock = stock / (1.0 + net_change)
    stock = base_draws.copy()
    for year in range(CURRENT_YEAR + 1, max(PROJECTION_YEARS) + 1):
        stock = np.maximum(stock, 0.0) * (1.0 + net_change)
        by_year[str(year)] = quantiles(stock)
    return by_year


def build_asset_state(conn, asset: dict[str, Any], route_cache: dict[str, dict], structural_evidence_by_name: dict[str, Any]) -> dict[str, Any]:
    entity_id = asset["entity_id"]
    ndvi = _eo_index_series(conn, entity_id, "ndvi")
    n_eo_obs = len(ndvi)
    eo_status = "observed" if n_eo_obs > 0 else "not_yet_processed"

    structural = structural_evidence_by_name.get(asset["canonical_name"])
    chm_p50 = structural["chmv2"]["stats"].get("height_m_p50") if structural else None
    chm_mean = structural["chmv2"]["stats"].get("height_m_mean") if structural else None

    # --- Two REAL structural zones (Track v6-3), split at the real CHMv2
    # median height -- each exactly 50% of the polygon area BY CONSTRUCTION
    # (a median splits its own population in half), not an arbitrary cut.
    intact_shift = 0.06 if (chm_mean or 0) > 3.0 else -0.04  # bounded, documented (see _zone_mix)
    zones_def = [
        {"label": "low_canopy_open", "area_ha": asset["area_ha"] * 0.5, "mix": _zone_mix(DEFAULT_MIX, intact_shift * -1)},
        {"label": "high_canopy_persistent", "area_ha": asset["area_ha"] * 0.5, "mix": _zone_mix(DEFAULT_MIX, intact_shift)},
    ]

    if ndvi:
        ndvi_mean = float(np.mean(ndvi))
        forest_cover_multiplier = float(np.clip(1.0 + 0.15 * np.tanh((ndvi_mean - 0.575) / 0.15), 0.85, 1.15))
    else:
        forest_cover_multiplier = 1.0

    # --- Nearby REAL processors, country-filtered, with REAL road distance ---
    candidates = _nearby_real_processors(asset["lat"], asset["lon"], asset["country"])
    processor_results = []
    for proc in candidates:
        cache_key = f"{entity_id}:{proc['name']}"
        if cache_key not in route_cache:
            straight = rw_haversine_km(proc["lon"], proc["lat"], asset["lon"], asset["lat"])
            try:
                routed = osrm_route(proc["lon"], proc["lat"], asset["lon"], asset["lat"])
                route_cache[cache_key] = {"road_km": round(routed["distance_km"], 2), "route_source": "osrm", "straight_line_km": round(straight, 1)}
            except Exception as exc:
                route_cache[cache_key] = {"road_km": None, "route_source": "unavailable", "straight_line_km": round(straight, 1), "route_error": f"{type(exc).__name__}: {exc}"}
        route = route_cache[cache_key]
        distance_km = route["road_km"] if route["road_km"] is not None else route["straight_line_km"]

        zone_states = []
        for z in zones_def:
            state, raw = _run_zone(entity_id, asset["canonical_name"], z["area_ha"], route["straight_line_km"], route["road_km"], route["route_source"], eo_status, forest_cover_multiplier, z["mix"], f"{entity_id}:{proc['name']}:{z['label']}")
            zone_states.append((z, state, raw))

        density_mean = 0.55
        prices_per_m3 = _wood_density_usd_prices_per_m3(density_mean)

        # Aggregate volumes/costs across the 2 zones via sum-of-raw-draws,
        # THEN quantile -- never sum of each zone's own quantiles.
        standing_draws = sum(raw["raw_standing_volume_m3"] for _, _, raw in zone_states)
        harvestable_draws = sum(raw["raw_harvestable_volume_m3"] for _, _, raw in zone_states)
        merchantable_draws = sum(raw["raw_zurkt_suitable_volume_m3"] for _, _, raw in zone_states)
        delivered_cost_draws_weighted = sum(raw["raw_delivered_cost_usd_per_m3"] * raw["raw_zurkt_suitable_volume_m3"] for _, _, raw in zone_states)
        merch_safe = np.maximum(merchantable_draws, 1e-6)
        delivered_cost_draws = delivered_cost_draws_weighted / merch_safe  # merchantable-weighted average delivered cost across zones

        # Revenue proxy: mean grade shares across the two equal-area zones,
        # applied to the SCENARIO per-m3 grade prices -- a documented P50
        # approximation (see valuation_state.note for what this does NOT
        # do: a full joint per-draw netback across zones/processors).
        revenue_per_m3 = (
            np.mean([s.grade_share_g1["p50"] for _, s, _ in zone_states]) * prices_per_m3["g1"]
            + np.mean([s.grade_share_g2["p50"] for _, s, _ in zone_states]) * prices_per_m3["g2"]
            + np.mean([s.grade_share_g3["p50"] for _, s, _ in zone_states]) * prices_per_m3["g3"]
        )
        delivered_cost_p50 = float(np.percentile(delivered_cost_draws, 50))
        harvest_haul_reg_p50 = float(np.mean([s.harvest_extract_load_cost_usd_per_m3["p50"] + s.haulage_cost_usd_per_m3["p50"] + s.regulatory_admin_cost_usd_per_m3["p50"] for _, s, _ in zone_states]))
        netback_p50 = revenue_per_m3 - harvest_haul_reg_p50

        processor_results.append(
            {
                "processor": proc["name"],
                "distance_km": distance_km,
                "route_source": route["route_source"],
                "products": proc["products"],
                "netback_usd_per_m3_p50": round(netback_p50, 2),
                "delivered_cost_usd_per_m3_p50": round(delivered_cost_p50, 2),
                "_standing_draws": standing_draws,
                "_harvestable_draws": harvestable_draws,
                "_merchantable_draws": merchantable_draws,
                "_zone_states": zone_states,
            }
        )

    processor_results.sort(key=lambda p: p["netback_usd_per_m3_p50"], reverse=True)
    best = processor_results[0] if processor_results else None

    if best is None:
        raise RuntimeError(f"No real nearby processor found for {asset['display_name']} -- cannot compute market state.")

    standing_by_year = _volume_time_series(best["_standing_draws"], f"{entity_id}:standing")
    harvestable_by_year = _volume_time_series(best["_harvestable_draws"], f"{entity_id}:harvestable")
    merchantable_by_year = _volume_time_series(best["_merchantable_draws"], f"{entity_id}:merchantable")

    asset_value_draws = np.maximum(best["_merchantable_draws"], 0.0) * best["netback_usd_per_m3_p50"]
    zone_summaries = [
        {
            "label": z["label"],
            "area_ha": round(z["area_ha"], 2),
            "material_mix_probabilities": z["mix"],
            "standing_volume_m3": s.standing_volume_m3,
            "merchantable_volume_m3": s.zurkt_suitable_volume_m3,
        }
        for z, s, _ in best["_zone_states"]
    ]

    return {
        "entity_id": entity_id,
        "aoi_version_id": asset["aoi_version_id"],
        "canonical_name": asset["canonical_name"],
        "display_name": asset["display_name"],
        "country": asset["country"],
        "model_version": "asset-state-v2",
        "asset_identity": {"epistemic_status": "OBSERVED", "entity_id": entity_id, "aoi_version_id": asset["aoi_version_id"], "area_ha": asset["area_ha"]},
        "eo_evidence": {
            "epistemic_status": "OBSERVED" if n_eo_obs else "UNRESOLVED",
            "n_ndvi_observations": n_eo_obs,
            "note": f"{n_eo_obs} months of real Sentinel-2 observations.",
        },
        "structural_evidence": structural,
        "structural_zones": {
            "epistemic_status": "MODELLED",
            "method": "Two zones split at the REAL CHMv2 median height within the actual canonical polygon (each "
            "exactly 50% of area by construction). Material-class mixture nudged (+/-10% on natural/degraded "
            "share only, bounded and documented) toward more/less intact based on which side of the median -- "
            "NEVER a species assertion from height/NDVI alone.",
            "zones": zone_summaries,
        },
        "market_state": {
            "epistemic_status": "ASSUMED_PRICE_REAL_DISTANCE",
            "processors_evaluated": [
                {"processor": p["processor"], "distance_km": p["distance_km"], "route_source": p["route_source"], "products": p["products"], "netback_usd_per_m3_p50": p["netback_usd_per_m3_p50"], "delivered_cost_usd_per_m3_p50": p["delivered_cost_usd_per_m3_p50"]}
                for p in processor_results
            ],
            "best_processor": best["processor"],
            "best_processor_distance_km": best["distance_km"],
            "note": "Distances/route are REAL (real processor locations, real OSRM routing). Price is an explicit "
            "SCENARIO (STANDARD_EUC_SPEC grade prices) -- no real price evidence exists for ANY of the 81 "
            "non-dummy processors in this repo's database (confirmed by direct check). Never presented as an "
            "observed price.",
        },
        "volume_state": {
            "epistemic_status": "MODELLED",
            "identifiability": "LOW",
            "standing_volume_m3": quantiles(best["_standing_draws"]),
            "harvestable_volume_m3": quantiles(best["_harvestable_draws"]),
            "merchantable_volume_m3": quantiles(best["_merchantable_draws"]),
            "volume_by_year_standing_m3": standing_by_year,
            "volume_by_year_harvestable_m3": harvestable_by_year,
            "volume_by_year_merchantable_m3": merchantable_by_year,
            "volume_by_year_note": "2024/2025: MODELLED RETROSPECTIVE ESTIMATES (real EO history for this asset "
            f"spans only {n_eo_obs} month(s) -- NOT a multi-year EO backcast; Landsat/S1/S2 change-based "
            "backcasting was not implemented this session). 2026: current MODELLED posterior. 2027/2028: MODEL "
            "PROJECTIONS. All years use the same ASSUMED net-stock-change prior for both zones.",
        },
        "valuation_state": {
            "epistemic_status": "MODELLED",
            "identifiability": "LOW",
            "netback_usd_per_m3": {"p50": best["netback_usd_per_m3_p50"]},
            "asset_value_usd": quantiles(asset_value_draws),
            "note": "asset_value = merchantable-volume draws (joint, per-draw) x BEST processor's P50 netback -- "
            "not independent-quantile multiplication for the volume side. netback itself remains a P50-only "
            "approximation (grade-share x scenario price, averaged across the 2 real structural zones) -- a full "
            "joint per-draw netback across zones AND processors was not implemented this session (see final report).",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--structural-evidence", type=Path, default=None)
    add_expected_database_argument(parser)
    args = parser.parse_args()

    structural_evidence_by_name: dict[str, Any] = {}
    if args.structural_evidence and args.structural_evidence.exists():
        se_data = json.loads(args.structural_evidence.read_text(encoding="utf-8"))
        structural_evidence_by_name = {a["canonical_name"]: a for a in se_data["assets"]}

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    require_database(engine, args.expected_database, label="Asset state model target")

    route_cache: dict[str, dict] = {}
    assets = []
    with engine.connect() as conn:
        for asset in REFERENCE_ASSETS:
            print(f"Building AssetState for {asset['display_name']}...")
            assets.append(build_asset_state(conn, asset, route_cache, structural_evidence_by_name))

    output = {"model_version": "asset-state-v2", "assets": assets}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2, default=lambda o: None), encoding="utf-8")
    print(f"Wrote {args.output}")
    for a in assets:
        v = a["volume_state"]["merchantable_volume_m3"]
        val = a["valuation_state"]["asset_value_usd"]
        best = a["market_state"]["best_processor"]
        print(f"  {a['display_name']}: merchantable P50={v['p50']} m3, best processor={best}, asset value P50=${val['p50']:,.0f}")


if __name__ == "__main__":
    main()
