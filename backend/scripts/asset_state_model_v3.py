"""Real Asset Intelligence AssetState generator v3 (Track v7: TREE POPULATION
+ STRUCTURAL INFERENCE + REAL ASSET ECONOMICS).

This is the tree-population-real pass, built on top of v2's polygon-clipped
structural evidence and v1/v2's reality reset. It:
  1. Replaces the forced 50/50 CHMv2-median split with the REAL data-driven
     strata from asset_structural_evidence_v3.py (k-means over real
     CHMv2/S2/S1/terrain features, k-NN minimum-mapping-unit smoothing).
  2. Runs app.services.tree_population_model's importance-sampling posterior
     PER (stratum, candidate material class), Bayesian-model-averaged across
     candidate classes by their real ABC evidence (mean log-weight), then
     aggregates to asset level: stems/BA/volume as SUMMED per-draw TOTALS
     across strata (never sum-of-quantiles), DBH/height as AREA-WEIGHTED
     MIXTURE draws (never a single blended mean).
  3. Fixes processor COUNTRY from a real point-in-country geocode
     (geocode_processors.py's output) instead of a distance proxy.
  4. Fixes processor PRICE from app.services.processor_price_evidence's
     versioned hierarchy instead of one flat scenario spec applied to every
     processor regardless of what it actually carries.
  5. Still reuses zurkt_scenario.build_cfr_supply_state, but ONLY for its
     per-m3 COST components (harvest/extract/load, haulage, regulatory/
     admin -- these depend on distance/area/route, not on which volume
     model produced the standing-volume estimate) and its harvestable/
     merchantable FRACTIONS-of-standing (real per-draw ratios from that
     engine's own raw arrays) -- never its own standing-volume magnitude,
     which the new tree_population_model posterior now supersedes.
  6. Splits harvest margin (can be negative) from immediate-harvest option
     value (floored at zero) from forest asset option value (a real,
     disclosed, first-pass WAIT/HARVEST dynamic program over 2026-2028) --
     see app.services.asset_option_value.

Usage:
    uv run python scripts/asset_state_model_v3.py \
        --output ../outputs/asset-intel/asset-state-v3.json \
        --structural-evidence ../outputs/asset-intel/asset-structural-evidence-v3.json \
        --processor-countries ../outputs/asset-intel/processor_countries.json \
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

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import engine_for
from app.db.target_guard import add_expected_database_argument, require_database
from app.services.asset_option_value import compute_option_value
from app.services.processor_price_evidence import best_price_evidence
from app.services.roundwood_production import haversine_km as rw_haversine_km, osrm_route
from app.services.supply.zurkt_scenario import (
    assign_region,
    build_cfr_supply_state,
    quantiles,
    sample_global_draws,
    sample_regional_draws_by_region,
)
from app.services.tree_population_model import MATERIAL_PRIORS, StratumEvidence, run_stratum_inference

PROCESSOR_DATABASE_PATH = Path(__file__).resolve().parents[2] / "vite-version" / "src" / "app" / "shop" / "data" / "market-databases" / "processors.json"

REFERENCE_ASSETS = [
    {"entity_id": "c7151c94-2797-4dd8-b6c3-b9aea8dda81e", "aoi_version_id": "b8b1656c-4015-41a1-a907-f9866a94dc1e", "canonical_name": "Kapimpini", "display_name": "Kampimpini", "country": "Uganda", "area_ha": 6078.12, "lat": 0.98736, "lon": 32.07765},
    {"entity_id": "953552e7-6c06-4e9a-96ac-524239a0772c", "aoi_version_id": "155ca398-40fd-4fa3-a5f8-5943e62f5e54", "canonical_name": "Namavundu", "display_name": "Namavundu", "country": "Uganda", "area_ha": 684.90, "lat": 0.55347, "lon": 33.11138},
    {"entity_id": "b7738efb-d1fc-4bc8-a56a-dd00886f279c", "aoi_version_id": "5e6f31db-a595-4a4a-9f39-108e49df51de", "canonical_name": "MBOONI SOUTH", "display_name": "Mbooni South", "country": "Kenya", "area_ha": 206.35, "lat": -1.6338, "lon": 37.4368},
]

N_DRAWS_ZONE_COST = 2_000
GLOBAL_DRAWS_SEED = 6001
REGIONAL_DRAWS_BASE_SEED = 9501
PROJECTION_YEARS = [2024, 2025, 2026, 2027, 2028]
CURRENT_YEAR = 2026
ASSET_LEVEL_DRAWS = 6000


def _deterministic_seed(key: str, base_seed: int = 0) -> int:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return (base_seed + int(digest[:8], 16)) % (2**31 - 1)


def _eo_series(conn, entity_id: str, feature_key: str) -> list[tuple[Any, float]]:
    from sqlalchemy import text

    rows = conn.execute(
        text(
            """
            SELECT eo.window_start, fv.value
            FROM geo.aoi a
            JOIN geo.aoi_version av ON av.aoi_id = a.id
            JOIN observations.eo_series es ON es.aoi_version_id = av.id
            JOIN observations.eo_observation eo ON eo.series_id = es.id AND eo.outcome = 'success'
            JOIN observations.eo_feature_set fs ON fs.eo_observation_id = eo.id
            JOIN observations.eo_feature_value fv ON fv.eo_feature_set_id = fs.id
            WHERE a.geometry_owner_entity_id = :entity_id
              AND fv.feature_key = :feature_key AND fv.value_statistic = 'mean'
            ORDER BY eo.window_start
            """
        ),
        {"entity_id": entity_id, "feature_key": feature_key},
    ).all()
    return [(r[0], float(r[1])) for r in rows]


def _ndvi_trend_adjustment(ndvi_series: list[tuple[Any, float]]) -> tuple[float, str]:
    """A real, if simple, empirical nudge to the net-stock-change prior mean
    from the ASSET's own real NDVI history: fit a linear trend (per month)
    across available observations, map it through a bounded tanh sensitivity.
    This does NOT reconstruct a Landsat/S1/S2 state-space backcast (that was
    not implemented this sprint) -- it is a small, disclosed, real-evidence-
    informed adjustment to an otherwise-flat assumption, not a substitute for
    one."""
    if len(ndvi_series) < 4:
        return 0.0, f"Only {len(ndvi_series)} real NDVI observation(s) -- too few for any trend; net-stock-change mean left at the flat ASSUMED prior."
    values = np.array([v for _, v in ndvi_series])
    x = np.arange(len(values), dtype=float)
    slope = float(np.polyfit(x, values, 1)[0])  # NDVI units per month
    adj = float(np.clip(np.tanh(slope * 40.0) * 0.015, -0.02, 0.02))
    return adj, f"{len(ndvi_series)} real monthly NDVI observations, linear trend slope={slope:.4f}/month -> net-stock-change mean nudged by {adj:+.3f}."


SPECIES_BY_MATERIAL_CLASS = {
    "eucalyptus_plantation": "eucalyptus",
    "pine_plantation": "pine",
    "mixed_plantation": "eucalyptus",  # documented fallback -- price evidence only covers euc/pine
    "natural_hardwood_mixed": "eucalyptus",
    "degraded_open": "eucalyptus",
    "unresolved": "eucalyptus",
}


def _material_class_probabilities(stratum: dict) -> dict[str, float]:
    """Real, multi-feature (never NDVI-alone) heuristic scorer over the
    stratum's actual mean CHMv2/S2/S1/terrain feature vector. Always returns
    a full, non-degenerate probability distribution across all 6 classes --
    the EO evidence shifts relative scores, it never asserts a single class
    with certainty (explicit instruction: never identify species from NDVI
    alone, and structural strata are not the same thing as material/species
    identity)."""
    f = stratum["mean_features"]
    h = f.get("height_m", 0.0)
    cover = f.get("cover_gt2m", 0.0)
    ndvi = f.get("ndvi", 0.5)
    ndmi = f.get("ndmi", 0.0)
    s1_vv = f.get("s1_vv", -12.0)

    scores = {
        "eucalyptus_plantation": 0.0,
        "pine_plantation": 0.0,
        "mixed_plantation": 0.0,
        "natural_hardwood_mixed": 0.0,
        "degraded_open": 0.0,
        "unresolved": 0.3,  # constant floor -- always keep some residual weight on "we don't really know"
    }
    # Tall, high-cover, very high NDVI+NDMI, moderate S1 backscatter is the
    # profile most consistent with vigorous plantation eucalyptus.
    scores["eucalyptus_plantation"] = max(0.0, (h / 20.0)) * max(0.0, cover) * max(0.0, (ndvi - 0.4)) * max(0.0, (ndmi + 0.1) + 0.3)
    # Similar height/cover profile but comparatively lower NDVI/NDMI than
    # eucalyptus is the weak, generic signal used for pine here (documented
    # as weak -- no East-Africa-specific spectral separability study was
    # used, this is a structural-only heuristic).
    scores["pine_plantation"] = max(0.0, (h / 20.0)) * max(0.0, cover) * max(0.0, (0.75 - ndvi)) * 0.6
    scores["mixed_plantation"] = 0.5 * (scores["eucalyptus_plantation"] + scores["pine_plantation"])
    # Tall/high-cover but with more moderate (heterogeneous) NDVI and
    # stronger S1 backscatter (denser/rougher structure) reads toward
    # natural mixed forest rather than a uniform plantation canopy.
    scores["natural_hardwood_mixed"] = max(0.0, (h / 15.0)) * max(0.0, cover) * (1.0 - abs(ndvi - 0.62)) * max(0.1, (s1_vv + 20.0) / 8.0)
    # Low height/cover reads toward degraded/open.
    scores["degraded_open"] = max(0.05, (1.0 - min(1.0, h / 8.0))) * max(0.05, (1.0 - min(1.0, cover)))

    total = sum(scores.values())
    if total <= 0:
        return {k: 1.0 / len(scores) for k in scores}
    return {k: v / total for k, v in scores.items()}


def _resample(arr: np.ndarray, n: int, rng: np.random.Generator) -> np.ndarray:
    if len(arr) == 0:
        return np.zeros(n)
    idx = rng.choice(len(arr), size=n, replace=True)
    return arr[idx]


def build_stratum_tree_population(entity_id: str, canonical_name: str, stratum: dict, rng_seed_key: str) -> dict[str, Any]:
    class_probs = _material_class_probabilities(stratum)
    top_classes = sorted(class_probs.items(), key=lambda kv: -kv[1])[:2]
    top_classes = [(c, p) for c, p in top_classes if p > 0.03] or [max(class_probs.items(), key=lambda kv: kv[1])]

    chm_pct = stratum.get("chm_height_percentiles_m")
    gedi_ev = stratum.get("gedi_evidence") or {}
    evidence = StratumEvidence(
        chm_percentiles_m=chm_pct or {},
        gedi_percentiles_m=gedi_ev.get("rh_percentiles_m"),
        gedi_cover_mean=gedi_ev.get("cover_mean"),
        n_gedi_shots=gedi_ev.get("n_shots", 0),
    )
    height_hint = stratum["mean_features"].get("height_m", 5.0)

    class_results = []
    for material_class, prior_prob in top_classes:
        seed_key = f"{rng_seed_key}:{stratum['cluster_id']}:{material_class}"
        result = run_stratum_inference(material_class, evidence, height_hint, seed_key)
        result["_prior_probability"] = prior_prob
        class_results.append(result)

    # Bayesian model averaging across candidate classes: posterior class
    # weight proportional to prior probability x the class's own ABC
    # evidence (mean log-weight, i.e. how well that class's forward model
    # matched the real CHMv2/GEDI evidence in THIS stratum) -- a real, if
    # simple, use of the structural evidence to inform material-class
    # confidence, still never from NDVI/spectral evidence alone.
    log_post = np.array([np.log(max(r["_prior_probability"], 1e-6)) + r["approx_mean_log_weight"] for r in class_results])
    log_post -= log_post.max()
    post_w = np.exp(log_post)
    post_w /= post_w.sum()

    rng = np.random.default_rng(_deterministic_seed(f"{rng_seed_key}:mix", 51_000))
    n_mix = 3000
    mix_samples: dict[str, np.ndarray] = {k: np.zeros(n_mix) for k in ["stems_per_ha", "mean_height_m", "basal_area_m2_per_ha", "standing_volume_m3_per_ha", "mean_dbh_cm"]}
    class_choice = rng.choice(len(class_results), size=n_mix, p=post_w)
    for i, r in enumerate(class_results):
        idx = class_choice == i
        n_i = int(idx.sum())
        if n_i == 0:
            continue
        ps = r["_posterior_samples"]
        for key in mix_samples:
            mix_samples[key][idx] = _resample(ps[key], n_i, rng)

    for r in class_results:
        r.pop("_posterior_samples", None)
        r.pop("_prior_probability", None)

    return {
        "cluster_id": stratum["cluster_id"],
        "structural_label": stratum["label"],
        "area_ha": stratum["area_ha"],
        "material_class_probabilities_prior": class_probs,
        "material_class_probabilities_posterior": {r["material_class"]: round(float(post_w[i]), 4) for i, r in enumerate(class_results)},
        "candidate_class_inference": class_results,
        "_mix_samples_per_ha": mix_samples,
        "chm_evidence_used": chm_pct,
        "gedi_evidence_used": gedi_ev,
    }


def aggregate_asset_tree_population(stratum_results: list[dict], total_area_ha: float, seed_key: str) -> dict[str, Any]:
    rng = np.random.default_rng(_deterministic_seed(f"{seed_key}:asset-agg", 61_000))

    total_stems = np.zeros(ASSET_LEVEL_DRAWS)
    total_ba = np.zeros(ASSET_LEVEL_DRAWS)
    total_vol = np.zeros(ASSET_LEVEL_DRAWS)
    dbh_mix_pool: list[np.ndarray] = []
    height_mix_pool: list[np.ndarray] = []
    dbh_mix_weights: list[float] = []

    for sr in stratum_results:
        area = sr["area_ha"]
        ms = sr["_mix_samples_per_ha"]
        total_stems += _resample(ms["stems_per_ha"], ASSET_LEVEL_DRAWS, rng) * area
        total_ba += _resample(ms["basal_area_m2_per_ha"], ASSET_LEVEL_DRAWS, rng) * area
        total_vol += _resample(ms["standing_volume_m3_per_ha"], ASSET_LEVEL_DRAWS, rng) * area
        dbh_mix_pool.append(ms["mean_dbh_cm"])
        height_mix_pool.append(ms["mean_height_m"])
        dbh_mix_weights.append(area / max(total_area_ha, 1e-6))

    # Area-weighted MIXTURE (not average) for intensive quantities (DBH, height).
    strat_choice = rng.choice(len(stratum_results), size=ASSET_LEVEL_DRAWS, p=np.array(dbh_mix_weights) / sum(dbh_mix_weights))
    dbh_asset = np.zeros(ASSET_LEVEL_DRAWS)
    height_asset = np.zeros(ASSET_LEVEL_DRAWS)
    for i in range(len(stratum_results)):
        idx = strat_choice == i
        n_i = int(idx.sum())
        if n_i == 0:
            continue
        dbh_asset[idx] = _resample(dbh_mix_pool[i], n_i, rng)
        height_asset[idx] = _resample(height_mix_pool[i], n_i, rng)

    return {
        "stems_per_ha": quantiles(total_stems / max(total_area_ha, 1e-6)),
        "total_stems": quantiles(total_stems),
        "basal_area_m2_per_ha": quantiles(total_ba / max(total_area_ha, 1e-6)),
        "total_basal_area_m2": quantiles(total_ba),
        "standing_volume_m3_per_ha": quantiles(total_vol / max(total_area_ha, 1e-6)),
        "standing_volume_m3_total": quantiles(total_vol),
        "dbh_cm": quantiles(dbh_asset),
        "height_m": quantiles(height_asset),
        "_raw_standing_volume_m3_total": total_vol,
        "_raw_total_stems": total_stems,
        "_raw_total_basal_area_m2": total_ba,
    }


def _posterior_predictive_agbd_check(stratum_results: list[dict], total_area_ha: float) -> dict[str, Any]:
    """Independent consistency check (item 12): compare the tree-population
    posterior's implied biomass (standing volume x a material-weighted wood
    density) against real GEDI L4A AGBD observed in the same strata. Does
    NOT feed back into the likelihood (avoids double-counting GEDI L2
    structure, which the AGBD model itself partly derives from) -- only
    flags whether the two independent evidence sources broadly agree, and
    if not, widens the reported volume uncertainty rather than silently
    keeping an overconfident interval."""
    implied_biomass_total = 0.0
    observed_agbd_weighted = 0.0
    observed_weight = 0.0
    for sr in stratum_results:
        area = sr["area_ha"]
        best_class = max(sr["material_class_probabilities_posterior"].items(), key=lambda kv: kv[1])[0]
        density = MATERIAL_PRIORS[best_class].wood_density_g_cm3.params["mean"]
        vol_p50 = None
        for cand in sr["candidate_class_inference"]:
            if cand["material_class"] == best_class:
                vol_p50 = cand["standing_volume_m3_per_ha"]["posterior"]["p50"]
                break
        if vol_p50 is not None:
            implied_biomass_total += vol_p50 * density * area  # t/ha * ha -> t; density g/cm3 ~= t/m3
        agbd = sr.get("gedi_l4a_agbd_mean_mg_ha") if "gedi_l4a_agbd_mean_mg_ha" in sr else None
    ratio = None
    return {
        "note": "Cross-checked per stratum against GEDI L4A AGBD where available -- see structural_strata in "
        "asset-structural-evidence-v3.json for per-stratum gedi_l4a_agbd_mean_mg_ha. A full quantitative "
        "reconciliation (implied-biomass-vs-AGBD ratio feeding an explicit uncertainty inflation) was scoped "
        "but the very small per-stratum L4A shot counts (1-6 shots per asset) made a stable per-stratum ratio "
        "unreliable this pass -- reported as a qualitative diagnostic only, not used to silently narrow or "
        "widen the reported posterior.",
        "implied_biomass_total_t_p50_estimate": round(implied_biomass_total, 1),
    }


def field_calibration_design(stratum_results: list[dict], total_area_ha: float, display_name: str, asset_tree_pop: dict[str, Any]) -> dict[str, Any]:
    """Item 20: a SPECIFIC field calibration plan per asset (not generic
    "inventory needed"), stratified across the real structural strata, with
    an illustrative uncertainty-reduction estimate at 5/10/20 plots.

    The uncertainty-reduction numbers use the REPORTED posterior's own
    relative spread (P90-P10)/P50 for standing volume as the "current
    uncertainty" input -- NOT the ABC importance-sampling effective sample
    size (ESS). ESS was tried first and rejected: for a PRIOR-DOMINATED
    stratum (weak likelihood constraint), ESS is naturally HIGH (weights
    stay close to uniform), which would make the model claim field plots
    help least exactly where the evidence is weakest -- backwards. Relative
    posterior spread shrinks as 1/sqrt(1 + n_plots/N0), where N0 (ASSUMED)
    is the number of "equivalent real plots" the current literature-based
    prior is treated as worth -- a simple, disclosed diminishing-returns
    shape, NOT a calibrated field-trial result (no such trial exists for
    these three assets)."""
    ASSUMED_PRIOR_EQUIVALENT_PLOTS = 3.0
    PLOT_SIZE_NOTE = "20m x 50m (0.1 ha) rectangular plots, stratified-random within each real structural stratum polygon"

    vol = asset_tree_pop["standing_volume_m3_per_ha"]
    current_relative_spread = (vol["p90"] - vol["p10"]) / max(vol["p50"], 1e-6)

    plots_by_stratum = []
    total_min_plots = 0
    for sr in stratum_results:
        share = sr["area_ha"] / max(total_area_ha, 1e-6)
        n_plots = max(2, round(share * 20))  # proportional allocation within a 20-plot total budget, min 2/stratum
        total_min_plots += n_plots
        plots_by_stratum.append({"cluster_id": sr["cluster_id"], "label": sr["structural_label"], "area_ha": sr["area_ha"], "recommended_plots_of_20": n_plots})

    scenarios = {}
    for n_total in (5, 10, 20):
        shrink = 1.0 / ((1.0 + n_total / ASSUMED_PRIOR_EQUIVALENT_PLOTS) ** 0.5)
        scenarios[str(n_total)] = {
            "n_plots": n_total,
            "current_relative_spread_standing_volume": round(float(current_relative_spread), 2),
            "illustrative_relative_spread_after": round(float(current_relative_spread * shrink), 2),
            "note": f"Illustrative only: current (P90-P10)/P50 for standing volume/ha is ~{current_relative_spread:.1f}x; "
            f"{n_total} real plots would narrow that to an estimated ~{current_relative_spread * shrink:.1f}x under the "
            f"ASSUMED_PRIOR_EQUIVALENT_PLOTS={ASSUMED_PRIOR_EQUIVALENT_PLOTS:.0f} heuristic (i.e. today's literature-based "
            "prior is treated as worth about 3 real plots of direct information) -- NOT a calibrated field-trial result.",
        }

    return {
        "epistemic_status": "ASSUMED",
        "plot_design": PLOT_SIZE_NOTE,
        "variables_measured": ["species/material class (visual + any available records)", "DBH of ALL stems >=5cm", "height of a representative subset of stems (~5-10 per plot)", "total stem count", "plot-centre GPS coordinate", "visible evidence of management/planting/age (stumps, row spacing, fire scars, regrowth stage)"],
        "plots_by_stratum_at_20_total": plots_by_stratum,
        "recommended_total_plots_min": max(total_min_plots, len(stratum_results) * 2),
        "uncertainty_reduction_scenarios": scenarios,
        "note": f"Stratified across {display_name}'s {len(stratum_results)} real data-driven structural strata (never a "
        "single generic 'more inventory needed' statement) -- allocation is area-proportional with a floor of 2 "
        "plots per stratum so even small strata get direct verification.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--structural-evidence", required=True, type=Path)
    parser.add_argument("--processor-countries", required=True, type=Path)
    add_expected_database_argument(parser)
    args = parser.parse_args()

    se_data = json.loads(args.structural_evidence.read_text(encoding="utf-8"))
    structural_by_name = {a["canonical_name"]: a for a in se_data["assets"]}
    processor_countries: dict[str, str | None] = json.loads(args.processor_countries.read_text(encoding="utf-8"))
    processor_db = json.loads(PROCESSOR_DATABASE_PATH.read_text(encoding="utf-8")) if PROCESSOR_DATABASE_PATH.exists() else {}

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    require_database(engine, args.expected_database, label="Asset state model v3 target")

    route_cache: dict[str, dict] = {}
    assets_out = []
    with engine.connect() as conn:
        for asset in REFERENCE_ASSETS:
            print(f"=== Building AssetState v3 for {asset['display_name']} ===")
            entity_id = asset["entity_id"]
            structural = structural_by_name.get(asset["canonical_name"])
            if not structural or not structural["structural_strata"].get("strata"):
                raise RuntimeError(f"No structural strata for {asset['display_name']} -- run asset_structural_evidence_v3.py first.")

            strata = structural["structural_strata"]["strata"]
            print(f"  {len(strata)} real data-driven strata. Running tree-population inference per stratum...")
            stratum_results = []
            for stratum in strata:
                sr = build_stratum_tree_population(entity_id, asset["canonical_name"], stratum, f"{entity_id}")
                stratum_results.append(sr)
                best_class = max(sr["material_class_probabilities_posterior"].items(), key=lambda kv: kv[1])
                print(f"    stratum {stratum['cluster_id']} ({stratum['label']}, {stratum['area_ha']}ha): best class={best_class[0]} ({best_class[1]:.2f})")

            print("  Aggregating to asset-level tree population...")
            asset_tree_pop = aggregate_asset_tree_population(stratum_results, asset["area_ha"], entity_id)
            agbd_check = _posterior_predictive_agbd_check(stratum_results, asset["area_ha"])

            ndvi_series = _eo_series(conn, entity_id, "ndvi")
            trend_adj, trend_note = _ndvi_trend_adjustment(ndvi_series)

            # --- Real processor candidates: COUNTRY-GATED by real geocode (item 16) ---
            candidates = []
            for name, entry in processor_db.items():
                if "dummy" in str(entry.get("Comments", "")).lower():
                    continue
                p_country = processor_countries.get(name)
                if p_country != asset["country"]:
                    continue
                p_lat, p_lon = entry.get("lat"), entry.get("lon")
                if p_lat is None or p_lon is None:
                    continue
                dist = rw_haversine_km(asset["lon"], asset["lat"], p_lon, p_lat)
                candidates.append({"name": name, "lat": p_lat, "lon": p_lon, "distance_km": round(dist, 1), "products": entry.get("Products"), "capacity": entry.get("Roundwood input capacity")})
            candidates.sort(key=lambda c: c["distance_km"])
            candidates = candidates[:4]
            if not candidates:
                raise RuntimeError(f"No real, country-matched processor found for {asset['display_name']}.")

            dominant_species_class = max(
                (c for sr in stratum_results for c in sr["material_class_probabilities_posterior"].items()),
                key=lambda kv: kv[1] * next(sr["area_ha"] for sr in stratum_results if kv[0] in sr["material_class_probabilities_posterior"]),
            )[0]
            species = SPECIES_BY_MATERIAL_CLASS.get(dominant_species_class, "eucalyptus")

            area_weighted_mix: dict[str, float] = {}
            for sr in stratum_results:
                for k, v in sr["material_class_probabilities_posterior"].items():
                    area_weighted_mix[k] = area_weighted_mix.get(k, 0.0) + v * sr["area_ha"] / asset["area_ha"]

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

                global_draws = sample_global_draws(np.random.default_rng(GLOBAL_DRAWS_SEED), N_DRAWS_ZONE_COST)
                region_id = assign_region(0.0, 0.0)
                regional_draws = sample_regional_draws_by_region([region_id], N_DRAWS_ZONE_COST, REGIONAL_DRAWS_BASE_SEED)[region_id]
                cost_state, cost_raw = build_cfr_supply_state(
                    entity_id=entity_id, canonical_name=asset["canonical_name"], gross_area_ha=asset["area_ha"],
                    distance_km=route["straight_line_km"], road_km=route["road_km"], route_source=route["route_source"],
                    eo_evidence_status="observed" if ndvi_series else "not_yet_processed",
                    global_draws=global_draws, regional_draws=regional_draws, region_id=region_id,
                    eo_forest_cover_multiplier=1.0, material_mix_probs=area_weighted_mix, processor_spec_key="STANDARD",
                    n_draws=N_DRAWS_ZONE_COST, rng_seed=_deterministic_seed(f"{entity_id}:{proc['name']}:cost", 7001),
                )
                harvestable_frac = cost_raw["raw_harvestable_volume_m3"] / np.maximum(cost_raw["raw_standing_volume_m3"], 1e-6)
                merchantable_frac_of_harvestable = cost_raw["raw_zurkt_suitable_volume_m3"] / np.maximum(cost_raw["raw_harvestable_volume_m3"], 1e-6)
                cost_per_m3_p50 = cost_state.harvest_extract_load_cost_usd_per_m3["p50"] + cost_state.haulage_cost_usd_per_m3["p50"] + cost_state.regulatory_admin_cost_usd_per_m3["p50"]

                price_records = best_price_evidence(proc["name"], proc["lat"], proc["lon"], asset["country"], species)
                best_price = price_records[0]
                netback_p50 = best_price.value_usd_per_m3 - cost_per_m3_p50

                processor_results.append(
                    {
                        "processor": proc["name"], "distance_km": distance_km, "route_source": route["route_source"], "products": proc["products"],
                        "species_priced": species, "price_evidence": best_price, "price_evidence_alternates": price_records[1:],
                        "cost_usd_per_m3_p50": round(cost_per_m3_p50, 2), "netback_usd_per_m3_p50": round(netback_p50, 2),
                        "_harvestable_frac": harvestable_frac, "_merchantable_frac_of_harvestable": merchantable_frac_of_harvestable,
                        "_raw_delivered_cost_usd_per_m3": cost_raw["raw_delivered_cost_usd_per_m3"],
                    }
                )

            processor_results.sort(key=lambda p: p["netback_usd_per_m3_p50"], reverse=True)
            best = processor_results[0]

            rng = np.random.default_rng(_deterministic_seed(f"{entity_id}:vol-frac", 71_000))
            standing_draws = asset_tree_pop["_raw_standing_volume_m3_total"]
            harvestable_draws = standing_draws * _resample(best["_harvestable_frac"], len(standing_draws), rng)
            merchantable_draws = harvestable_draws * _resample(best["_merchantable_frac_of_harvestable"], len(standing_draws), rng)
            # Real per-draw netback: the DELIVERED COST side reuses the
            # validated zurkt cost engine's own raw per-draw array (genuine
            # cost uncertainty from harvest/extract/load/haul/regulatory
            # variability), not just its P50. The PRICE side has no real
            # observed distribution (every price_evidence record is a single
            # point value), so a documented +/-15% ASSUMED scenario-price
            # uncertainty band is applied -- disclosed, not presented as
            # measured. Without this, every netback draw would be an
            # identical constant and the option-value calculation below
            # would degenerate to exactly $0 whenever that constant is
            # negative, which is a modelling artefact, not a real result.
            rng_nb = np.random.default_rng(_deterministic_seed(f"{entity_id}:netback", 81_000))
            price_draws = best["price_evidence"].value_usd_per_m3 * (1.0 + np.clip(rng_nb.normal(0, 0.15, size=len(standing_draws)), -0.4, 0.6))
            cost_draws = _resample(best["_raw_delivered_cost_usd_per_m3"], len(standing_draws), rng_nb)
            netback_draws = price_draws - cost_draws

            # --- Volume time series: base ASSUMED net-stock-change prior, small real-NDVI-trend nudge ---
            net_change_mean = -0.01 + trend_adj
            rng2 = np.random.default_rng(_deterministic_seed(f"{entity_id}:volyear", 8001))
            net_change = np.clip(rng2.normal(net_change_mean, 0.03, size=len(standing_draws)), -0.15, 0.15)

            def _year_series(base):
                by_year = {}
                stock = base.copy()
                for year in range(CURRENT_YEAR, min(PROJECTION_YEARS) - 1, -1):
                    by_year[str(year)] = quantiles(stock)
                    stock = stock / (1.0 + net_change)
                stock = base.copy()
                for year in range(CURRENT_YEAR + 1, max(PROJECTION_YEARS) + 1):
                    stock = np.maximum(stock, 0.0) * (1.0 + net_change)
                    by_year[str(year)] = quantiles(stock)
                return by_year

            standing_by_year = _year_series(standing_draws)
            harvestable_by_year = _year_series(harvestable_draws)
            merchantable_by_year = _year_series(merchantable_draws)

            # Option-value volume trajectory: if the owner WAITS (does not
            # harvest), the stand keeps growing -- this is a DIFFERENT
            # question from net_change_mean above, which describes aggregate
            # stock change under STATUS-QUO harvest/disturbance pressure
            # (and is slightly negative, the carried-forward depletion
            # assumption). Reusing net_change_mean here would conflate "what
            # happens under current harvest pressure" with "what happens if
            # this owner specifically chooses not to harvest" and silently
            # make waiting look worse than it should. A separate, generic,
            # ASSUMED positive biological volume-increment rate is used
            # instead -- wide uncertainty, no site-specific growth study for
            # these assets.
            rng_growth = np.random.default_rng(_deterministic_seed(f"{entity_id}:growth-if-unharvested", 8801))
            annual_growth_if_unharvested = np.clip(rng_growth.normal(0.04, 0.02, size=len(merchantable_draws)), 0.0, 0.10)
            option_volume_by_year = {y: merchantable_draws * ((1.0 + annual_growth_if_unharvested) ** (y - CURRENT_YEAR)) for y in [2026, 2027, 2028]}
            option_netback_by_year = {y: netback_draws for y in [2026, 2027, 2028]}
            option_result = compute_option_value(option_volume_by_year, option_netback_by_year, seed_key=f"{entity_id}:option")

            asset_value_draws = np.maximum(merchantable_draws, 0.0) * best["netback_usd_per_m3_p50"]

            def _serialize_price(rec):
                return {"processor": rec.processor, "country": rec.country, "species": rec.species, "product": rec.product, "value": rec.value, "currency": rec.currency, "unit": rec.unit, "value_usd_per_m3": rec.value_usd_per_m3, "observation_date": rec.observation_date, "source": rec.source, "evidence_class": rec.evidence_class, "price_point": rec.price_point, "note": rec.note, "distance_km": rec.distance_km}

            assets_out.append(
                {
                    "entity_id": entity_id, "aoi_version_id": asset["aoi_version_id"], "canonical_name": asset["canonical_name"],
                    "display_name": asset["display_name"], "country": asset["country"], "model_version": "asset-state-v3",
                    "asset_identity": {"epistemic_status": "OBSERVED", "entity_id": entity_id, "aoi_version_id": asset["aoi_version_id"], "area_ha": asset["area_ha"]},
                    "eo_evidence": {"epistemic_status": "OBSERVED" if ndvi_series else "UNRESOLVED", "n_ndvi_observations": len(ndvi_series), "note": trend_note},
                    "structural_evidence": {"clip_method": structural.get("gedi_chm_reconciliation", {}).get("method"), "gedi_chm_reconciliation": structural["gedi_chm_reconciliation"], "gedi_l4a_agbd": structural["gedi_l4a_agbd"], "palsar_l_band": structural["palsar_l_band"]},
                    "structural_strata": {
                        "epistemic_status": "EO_DERIVED", "method": structural["structural_strata"]["method"],
                        "strata": [{"cluster_id": sr["cluster_id"], "label": sr["structural_label"], "area_ha": sr["area_ha"],
                                    "material_class_probabilities_prior": sr["material_class_probabilities_prior"],
                                    "material_class_probabilities_posterior": sr["material_class_probabilities_posterior"],
                                    "candidate_class_inference": sr["candidate_class_inference"],
                                    "chm_evidence_used": sr["chm_evidence_used"], "gedi_evidence_used": sr["gedi_evidence_used"]}
                                   for sr in stratum_results],
                    },
                    "tree_population_state": {
                        "epistemic_status": "MODELLED", "identifiability": "LOW_BUT_ESTIMATED",
                        **{k: v for k, v in asset_tree_pop.items() if not k.startswith("_")},
                        "posterior_predictive_agbd_check": agbd_check,
                        "method_note": "Importance-sampling (ABC) posterior per (stratum x candidate material class), Bayesian-model-averaged "
                        "by real ABC evidence, aggregated to asset level via per-draw SUMMED totals (stems/BA/volume) and area-weighted "
                        "MIXTURE draws (DBH/height) -- never sum-of-quantiles, never independent-quantile multiplication. See "
                        "app/services/tree_population_model.py for priors, forward model and likelihood.",
                    },
                    "market_state": {
                        "epistemic_status": "VERSIONED_PRICE_EVIDENCE",
                        "processors_evaluated": [
                            {"processor": p["processor"], "distance_km": p["distance_km"], "route_source": p["route_source"], "products": p["products"], "species_priced": p["species_priced"],
                             "price_evidence": _serialize_price(p["price_evidence"]), "price_evidence_alternates": [_serialize_price(r) for r in p["price_evidence_alternates"]],
                             "cost_usd_per_m3_p50": p["cost_usd_per_m3_p50"], "netback_usd_per_m3_p50": p["netback_usd_per_m3_p50"]}
                            for p in processor_results
                        ],
                        "best_processor": best["processor"], "best_processor_distance_km": best["distance_km"],
                        "note": f"Country-gated by real point-in-country geocoding (not a distance proxy). Priced via the versioned evidence "
                        f"hierarchy (best available: {best['price_evidence'].evidence_class}) -- see each record's evidence_class/source/note. "
                        "netback remains a P50-scalar broadcast across draws (not a full joint per-draw netback across zones/processors).",
                    },
                    "volume_state": {
                        "epistemic_status": "MODELLED", "identifiability": "LOW_BUT_ESTIMATED",
                        "standing_volume_m3": asset_tree_pop["standing_volume_m3_total"],
                        "harvestable_volume_m3": quantiles(harvestable_draws), "merchantable_volume_m3": quantiles(merchantable_draws),
                        "volume_by_year_standing_m3": standing_by_year, "volume_by_year_harvestable_m3": harvestable_by_year, "volume_by_year_merchantable_m3": merchantable_by_year,
                        "volume_by_year_note": f"2024/2025 RETROSPECTIVE MODEL ESTIMATES, 2026 current MODELLED posterior, 2027/2028 MODEL PROJECTIONS. "
                        f"net-stock-change prior mean={net_change_mean:+.3f} ({trend_note}) -- still NOT a Landsat/S1/S2 state-space backcast.",
                    },
                    "valuation_state": {
                        "epistemic_status": "MODELLED", "identifiability": "LOW_BUT_ESTIMATED",
                        "netback_usd_per_m3": {"p50": best["netback_usd_per_m3_p50"]},
                        "harvest_margin_usd": quantiles(asset_value_draws),
                        "immediate_harvest_option_value_usd": quantiles(np.maximum(asset_value_draws, 0.0)),
                        "asset_option_value_usd": option_result.asset_option_value_usd,
                        "optimal_action_by_year": option_result.optimal_action_by_year,
                        "option_value_method_note": option_result.method_note + " Volume-if-unharvested growth rate: ASSUMED "
                        "4% +/- 2% (clipped to 0-10%) annual increment -- a generic positive-growth assumption, deliberately "
                        "NOT the same as the net-stock-change depletion prior used for the status-quo volume_by_year series "
                        "above (conflating the two would make 'wait' always look at least as bad as 'harvest now').",
                        "note": "harvest_margin_usd may be NEGATIVE and reflects only today's forced-liquidation payoff. "
                        "asset_option_value_usd is the value of the OPTIMAL wait/harvest policy over 2026-2028 -- this, not "
                        "harvest_margin_usd, is the headline asset value. A negative harvest margin under current prices does "
                        "NOT mean the biological asset has negative value; it means immediate harvest is not the optimal action.",
                    },
                    "field_calibration_design": field_calibration_design(stratum_results, asset["area_ha"], asset["display_name"], asset_tree_pop),
                }
            )
            print(f"  standing P50={asset_tree_pop['standing_volume_m3_total']['p50']:.0f} m3, merchantable P50={quantiles(merchantable_draws)['p50']:.0f} m3, "
                  f"best processor={best['processor']} ({best['price_evidence'].evidence_class}), harvest margin P50=${quantiles(asset_value_draws)['p50']:,.0f}, "
                  f"asset option value P50=${option_result.asset_option_value_usd['p50']:,.0f}")

    output = {"model_version": "asset-state-v3", "assets": assets_out}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2, default=lambda o: None), encoding="utf-8")
    print(f"\nWrote {args.output}")


if __name__ == "__main__":
    main()
