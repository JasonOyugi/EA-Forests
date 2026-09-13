"""Real Asset Intelligence AssetState generator (Track v5).

Replaces the synthetic sub-block/species/DBH/contractor/invoice model in
vite-version/src/app/dashboard/data/forestry-data.ts with a genuine,
uncertainty-aware AssetState for each of the three reference assets:
Kapimpini (display "Kampimpini"), Namavundu, Mbooni South.

REUSES rather than reimplements: this deliberately calls
app.services.supply.zurkt_scenario.build_cfr_supply_state -- the SAME
validated hierarchical Monte Carlo engine built for the Zurkt/Evergreen
supply case -- treating each reference asset as a single-CFR "catchment"
against the nearest KNOWN processor location in this repository
(Evergreen Wood Industries, Mpigi). This is not a second, divergent tree/
volume/cost model; it is the one model applied to a new target.

HONESTY CONSTRAINTS (explicit, matching the sprint's own instructions):
  - No individual tree is modelled. mu_t (the latent tree population) is
    represented as a discretized empirical measure over (dbh, height)
    implied by the sampled stand-level mean/std -- exactly what
    zurkt_scenario._grade_shares already does, not literal tree objects.
  - Every field carries an explicit epistemic status: OBSERVED, EO_DERIVED,
    MODELLED, ASSUMED, VERIFIED, or UNRESOLVED. Nothing here is VERIFIED.
  - Every field carries an explicit identifiability: HIGH, MEDIUM, LOW, or
    NOT_IDENTIFIABLE. Tree COUNT and DBH are LOW -- no CHMv2/GEDI/ICESat-2
    pipeline is wired into this database yet (see the sprint's own final
    report for what was actually investigated and found this session), and
    no field inventory exists for any of these three assets.
  - No processor price for Evergreen was found in any real source (a
    dedicated web-research pass this session found none). The netback
    calculation below uses STANDARD_EUC_SPEC's existing per-tonne grade
    prices (already used elsewhere in this repo, e.g. Zurkt's
    "STANDARD" processor-spec scenario) as an explicit SCENARIO price,
    never presented as Evergreen's real buying price.
  - Real EO evidence differs sharply by asset: Kapimpini/Namavundu have 12
    months of real Sentinel-2 observations; Mbooni South has only 1 -- this
    difference is carried through as a real confidence/identifiability
    difference, not smoothed over.

Usage:
    uv run python scripts/asset_state_model.py \
        --output ../outputs/asset-intel/asset-state-v1.json \
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
    gives the same seed every run, matching the pattern already used in
    zurkt_scenario.py's region seeding."""
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return (base_seed + int(digest[:8], 16)) % (2**31 - 1)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np

from app.db.session import engine_for
from app.db.target_guard import add_expected_database_argument, require_database
from app.services.roundwood_production import STANDARD_EUC_SPEC, UGX_PER_USD, haversine_km as rw_haversine_km, osrm_route
from app.services.supply.zurkt_scenario import (
    DEFAULT_MATERIAL_MIX_PROBS,
    assign_region,
    build_cfr_supply_state,
    quantiles,
    sample_global_draws,
    sample_regional_draws_by_region,
)

# The only real, independently-verified processor location known anywhere
# in this repository (see backend/scripts/zurkt_supply_catchment.py). Used
# for the actual harvest/haul/delivered-cost Monte Carlo (build_cfr_supply_
# state expects ONE target). A broader 86-processor database DOES exist
# (vite-version/src/app/shop/data/market-databases/processors.json,
# confirmed this session) and is used below ONLY to report real NEARBY
# processor identity/product/capacity for context -- it carries NO real
# price for any of its 81 non-dummy entries (confirmed by direct check),
# so it cannot itself drive the netback calculation.
EVERGREEN_PROCESSOR = {"canonical_name": "Evergreen Wood Industries Ltd", "lat": 0.258846, "lon": 32.4077845}
PROCESSOR_DATABASE_PATH = Path(__file__).resolve().parents[2] / "vite-version" / "src" / "app" / "shop" / "data" / "market-databases" / "processors.json"


def _nearby_real_processors(lat: float, lon: float, top_n: int = 3) -> list[dict[str, Any]]:
    """Real processor identities near this asset from the 86-entry database
    -- excludes the 5 entries explicitly flagged as dummy test data. NO
    price is reported here: none of the 81 real entries carry actual price
    evidence (confirmed by direct check this session) -- this is honestly
    a location/product/capacity lookup only, not a pricing source."""
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
        candidates.append(
            {
                "name": name,
                "distance_km": round(dist, 1),
                "products": entry.get("Products"),
                "capacity": entry.get("Roundwood input capacity"),
                "certification": entry.get("Certification"),
                "coordinate_confidence": entry.get("Coordinate confidence"),
            }
        )
    candidates.sort(key=lambda c: c["distance_km"])
    return candidates[:top_n]

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


def _wood_density_usd_prices_per_m3(density_t_per_m3: float) -> dict[str, float]:
    """STANDARD_EUC_SPEC's per-tonne grade prices (UGX), converted to USD/m3
    at the repo's own standard density -- a SCENARIO price, not an observed
    Evergreen buying price (none exists in any source found this session)."""
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


def build_asset_state(conn, asset: dict[str, Any], route_cache: dict[str, dict], structural_evidence_by_name: dict[str, Any]) -> dict[str, Any]:
    entity_id = asset["entity_id"]
    ndvi = _eo_index_series(conn, entity_id, "ndvi")
    ndmi = _eo_index_series(conn, entity_id, "ndmi")
    nbr = _eo_index_series(conn, entity_id, "nbr")
    n_eo_obs = len(ndvi)

    # DERIVED distance/route -- real, never a silent straight-line-as-if-routed.
    straight_line_km = rw_haversine_km(EVERGREEN_PROCESSOR["lon"], EVERGREEN_PROCESSOR["lat"], asset["lon"], asset["lat"])
    cache_key = asset["entity_id"]
    if cache_key not in route_cache:
        try:
            routed = osrm_route(EVERGREEN_PROCESSOR["lon"], EVERGREEN_PROCESSOR["lat"], asset["lon"], asset["lat"])
            route_cache[cache_key] = {"road_km": round(routed["distance_km"], 2), "route_source": "osrm"}
        except Exception as exc:
            route_cache[cache_key] = {"road_km": None, "route_source": "unavailable", "route_error": f"{type(exc).__name__}: {exc}"}
    route = route_cache[cache_key]

    # EO-CONDITIONED forest-cover nudge (Track v4-10 machinery, reused
    # as-is): real NDVI percentile within a broad reference population is
    # not meaningful for a single asset in isolation, so this uses the
    # asset's own NDVI level against a fixed generic reference band
    # (0.4-0.75, typical dense-tropical-forest NDVI) rather than a
    # catchment percentile -- a documented, coarser proxy for a single-asset
    # context.
    if ndvi:
        ndvi_mean = float(np.mean(ndvi))
        forest_cover_multiplier = float(np.clip(1.0 + 0.15 * np.tanh((ndvi_mean - 0.575) / 0.15), 0.85, 1.15))
    else:
        forest_cover_multiplier = 1.0

    global_draws = sample_global_draws(np.random.default_rng(GLOBAL_DRAWS_SEED), N_DRAWS)
    region_id = assign_region(asset["lat"], asset["lon"])
    regional_draws = sample_regional_draws_by_region([region_id], N_DRAWS, REGIONAL_DRAWS_BASE_SEED)[region_id]

    state, raw = build_cfr_supply_state(
        entity_id=entity_id,
        canonical_name=asset["canonical_name"],
        gross_area_ha=asset["area_ha"],
        distance_km=straight_line_km,
        road_km=route["road_km"],
        route_source=route["route_source"],
        eo_evidence_status="observed" if n_eo_obs > 0 else "not_yet_processed",
        global_draws=global_draws,
        regional_draws=regional_draws,
        region_id=region_id,
        eo_forest_cover_multiplier=forest_cover_multiplier,
        material_mix_probs=DEFAULT_MATERIAL_MIX_PROBS,  # no asset-specific plantation evidence found this session
        processor_spec_key="STANDARD",
        n_draws=N_DRAWS,
        rng_seed=_deterministic_seed(entity_id, 7001),
    )

    # NETBACK (Track v5-17): revenue side is an explicit SCENARIO price
    # (STANDARD_EUC_SPEC, already used elsewhere in this repo), never an
    # observed Evergreen price -- none was found in any source this
    # session. Netback = scenario delivered price - harvest/extract/load -
    # haulage - regulatory (EXCLUDING procurement/stumpage, since the
    # stumpage/netback IS the quantity being solved for here, not a cost
    # subtracted from it). Computed quantile-wise (P10 vs P10 etc.) as a
    # documented approximation, not a re-run joint Monte Carlo.
    density_mean = 0.55  # matches zurkt_scenario PRIORS["wood_density_t_per_m3"] mean
    prices_per_m3 = _wood_density_usd_prices_per_m3(density_mean)
    netback = {}
    for q in ("p10", "p50", "p90"):
        revenue = (
            state.grade_share_g1[q] * prices_per_m3["g1"]
            + state.grade_share_g2[q] * prices_per_m3["g2"]
            + state.grade_share_g3[q] * prices_per_m3["g3"]
        )
        cost = state.harvest_extract_load_cost_usd_per_m3[q] + state.haulage_cost_usd_per_m3[q] + state.regulatory_admin_cost_usd_per_m3[q]
        netback[q] = round(revenue - cost, 2)

    asset_value = {q: round(netback[q] * state.zurkt_suitable_volume_m3[q], 1) for q in ("p10", "p50", "p90")}

    # VOLUME TIME SERIES (Track v5-15): 2026 is the current posterior
    # (zurkt_suitable_volume_m3, i.e. merchantable/commercially-relevant
    # volume). 2024/2025 are MODELLED RETROSPECTIVE ESTIMATES -- NOT real
    # multi-year backcasts, because real EO history in this database for
    # these assets is itself only ~1 year deep (12 monthly observations for
    # Kapimpini/Namavundu, 1 for Mbooni South -- confirmed by direct query,
    # not assumed) -- so there is no real multi-year EO signal to invert.
    # Instead the SAME net-stock-change prior used by the Zurkt depletion
    # stress test is run backward (dividing out the assumed annual change)
    # and forward (compounding it) from the 2026 posterior. 2027/2028 are
    # MODEL PROJECTIONS on the same basis.
    rng = np.random.default_rng(_deterministic_seed(entity_id, 8001))
    net_change = np.clip(rng.normal(NET_STOCK_CHANGE_FRACTION_MEAN, NET_STOCK_CHANGE_FRACTION_STD, size=N_DRAWS), -0.15, 0.15)
    base_draws = raw["raw_zurkt_suitable_volume_m3"]
    volume_by_year = {}
    stock = base_draws.copy()
    for year in range(CURRENT_YEAR, min(PROJECTION_YEARS) - 1, -1):
        volume_by_year[year] = quantiles(stock)
        stock = stock / (1.0 + net_change)  # inverse compounding -- backcast
    stock = base_draws.copy()
    for year in range(CURRENT_YEAR + 1, max(PROJECTION_YEARS) + 1):
        stock = np.maximum(stock, 0.0) * (1.0 + net_change)
        volume_by_year[year] = quantiles(stock)

    return {
        "entity_id": entity_id,
        "aoi_version_id": asset["aoi_version_id"],
        "canonical_name": asset["canonical_name"],
        "display_name": asset["display_name"],
        "country": asset["country"],
        "model_version": "asset-state-v1",
        "asset_identity": {
            "epistemic_status": "OBSERVED",
            "entity_id": entity_id,
            "aoi_version_id": asset["aoi_version_id"],
            "area_ha": asset["area_ha"],
        },
        "eo_evidence": {
            "epistemic_status": "OBSERVED" if n_eo_obs else "UNRESOLVED",
            "n_ndvi_observations": n_eo_obs,
            "n_ndmi_observations": len(ndmi),
            "n_nbr_observations": len(nbr),
            "note": f"{n_eo_obs} months of real Sentinel-2 observations -- "
            + ("a real ~1-year time series." if n_eo_obs >= 6 else "far too sparse for any real temporal signal (single observation)." if n_eo_obs == 1 else "no observations processed yet."),
        },
        "distance_to_nearest_known_processor": {
            "epistemic_status": "DERIVED" if route["route_source"] == "osrm" else "ASSUMED",
            "processor": EVERGREEN_PROCESSOR["canonical_name"],
            "straight_line_km": round(straight_line_km, 1),
            "road_km": route["road_km"],
            "route_source": route["route_source"],
            "note": "This is the harvest/haul cost engine's REFERENCE processor (the only one with a validated "
            "delivered-cost Monte Carlo built for it) -- NOT necessarily the true nearest processor. See "
            "nearby_real_processors below for genuinely closer real processors from a separate 86-entry database.",
        },
        "nearby_real_processors": {
            "epistemic_status": "OBSERVED",
            "processors": _nearby_real_processors(asset["lat"], asset["lon"]),
            "note": "Real processor identities/locations/products/capacity from a separate 86-entry database "
            "(vite-version/src/app/shop/data/market-databases/processors.json), excluding 5 entries explicitly "
            "flagged as dummy test data. NONE of the 81 real entries carry actual price evidence (confirmed by "
            "direct check) -- reported for location/product context only, not used for netback.",
        },
        "material_state": {
            "epistemic_status": "ASSUMED",
            "identifiability": "LOW",
            "mixture_probabilities": DEFAULT_MATERIAL_MIX_PROBS,
            "note": "No asset-specific plantation/species evidence was found for this asset this session -- "
            "broad default mixture prior, not a fabricated point classification.",
        },
        "structural_evidence": structural_evidence_by_name.get(asset["canonical_name"], {"note": "No structural evidence pulled for this asset."}),
        "tree_population_state": {
            "epistemic_status": "MODELLED",
            "stems_per_ha_identifiability": "LOW",
            # Real CHMv2/GEDI structural evidence was pulled this session (Track v5-5/6) and is
            # attached under structural_evidence above, but a 1km circular buffer around this
            # asset's reference POINT is not yet clipped to its real canonical polygon (a real
            # limitation, not an oversight -- see structural_evidence.note), and canopy-SURFACE
            # height (what CHMv2/GEDI actually measure) is not the same as individual-tree height
            # -- so this stays LOW rather than being upgraded on the strength of an unclipped,
            # surface-level signal.
            "dbh_identifiability": "LOW",
            "height_identifiability": "LOW",
            "note": "No field-plot/allometric calibration exists for any of these 3 assets. Real CHMv2/GEDI "
            "structural evidence now exists (see structural_evidence) but is not yet clipped to the real "
            "canonical polygon or converted into a calibrated height/DBH posterior -- these remain broad "
            "stand-level priors (zurkt_scenario.PRIORS), not remotely-sensed distributions.",
            "relevant_stocked_area_ha": state.relevant_stocked_area_ha,
        },
        "volume_state": {
            "epistemic_status": "MODELLED",
            "identifiability": "LOW",
            "standing_volume_m3": state.standing_volume_m3,
            "harvestable_volume_m3": state.harvestable_volume_m3,
            "merchantable_volume_m3": state.zurkt_suitable_volume_m3,
            "grade_shares": {"g1": state.grade_share_g1, "g2": state.grade_share_g2, "g3": state.grade_share_g3},
            "volume_by_year_m3": volume_by_year,
            "volume_by_year_note": "2024/2025: MODELLED RETROSPECTIVE ESTIMATES (real EO history for this asset "
            f"spans only {n_eo_obs} month(s) -- NOT a multi-year EO backcast). 2026: current MODELLED posterior. "
            "2027/2028: MODEL PROJECTIONS. All years use the same ASSUMED net-stock-change prior, not a "
            "calibrated growth model.",
        },
        "market_state": {
            "epistemic_status": "ASSUMED",
            "procurement_cost_usd_per_m3": state.procurement_cost_usd_per_m3,
            "harvest_extract_load_cost_usd_per_m3": state.harvest_extract_load_cost_usd_per_m3,
            "haulage_cost_usd_per_m3": state.haulage_cost_usd_per_m3,
            "regulatory_admin_cost_usd_per_m3": state.regulatory_admin_cost_usd_per_m3,
            "delivered_cost_usd_per_m3": state.delivered_cost_usd_per_m3,
            "scenario_price_usd_per_m3_by_grade": {g: round(p, 2) for g, p in prices_per_m3.items()},
            "price_note": "SCENARIO price (STANDARD_EUC_SPEC grade prices, already used elsewhere in this repo "
            "for the Zurkt/Evergreen case) -- no real Evergreen buying price was found in any source this session.",
        },
        "valuation_state": {
            "epistemic_status": "MODELLED",
            "identifiability": "LOW",
            "netback_usd_per_m3": netback,
            "asset_value_usd": asset_value,
            "note": "netback = SCENARIO delivered price - harvest/extract/load - haulage - regulatory (excludes "
            "procurement/stumpage, which IS the netback being solved for). Computed quantile-wise (P10 vs P10 "
            "etc.), a documented approximation, not a re-run joint Monte Carlo. Values a fraction of standing "
            "volume (merchantable/suitable), not all biological standing volume.",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--structural-evidence",
        type=Path,
        default=None,
        help="Optional asset_structural_evidence.py output JSON (real CHMv2/GEDI pull) -- attached under "
        "each asset's structural_evidence field. Omit to run without it.",
    )
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

    output = {"model_version": "asset-state-v1", "assets": assets}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {args.output}")
    for a in assets:
        v = a["volume_state"]["merchantable_volume_m3"]
        val = a["valuation_state"]["asset_value_usd"]
        print(f"  {a['display_name']}: merchantable volume P50={v['p50']} m3, asset value P50=${val['p50']:,.0f}")


if __name__ == "__main__":
    main()
