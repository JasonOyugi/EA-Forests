"""Zurkt Uganda supply model runner (Tracks 4/10/11/12/14/15).

Reads the routed catchment (zurkt_road_distance.py output), runs the
CFR-level Monte Carlo (app.services.supply.zurkt_scenario) for every
catchment CFR, then builds the aggregate deliverables: the delivered-cost
supply curve, a 10-year outlook, one-variable sensitivity analysis, and an
approximate verification-priority ranking. Writes the output artifacts
listed in the sprint spec under outputs/supply/.

Every ASSUMED distribution and its rationale is carried through into the
output JSON so a reader can see exactly what was modelled vs. assumed vs.
observed, per CFR and in aggregate. No physical invariant is allowed to
silently fail (Track 28) -- violations abort the run rather than writing
a result that looks confident but isn't.

Usage:
    uv run python scripts/zurkt_run_supply_model.py \
        --input ../outputs/supply/zurkt-uganda-catchment-routed.json \
        --out-dir ../outputs/supply
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.supply.zurkt_scenario import (  # noqa: E402
    GLOBAL_FUEL_PRICE_LAMBDA_PRIOR,
    GLOBAL_GRADE_RECOVERY_DBH_BIAS_PRIOR,
    GLOBAL_STOCKING_MODEL_BIAS_PRIOR,
    MEASUREMENT_WIDEN_FACTOR,
    MODEL_VERSION,
    PRIORS,
    PRIORS_ANNUAL_HARVEST_FRACTION,
    PROCESSOR_SPECIFICATION_SCENARIOS,
    REGIONAL_MATURITY_MULTIPLIER_PRIOR,
    REGIONAL_STOCKED_MULTIPLIER_PRIOR,
    SCENARIO_VERSION,
    assign_region,
    build_cfr_supply_state,
    quantiles,
    sample_global_draws,
    sample_regional_draws_by_region,
)

N_DRAWS = 2_000
ECONOMIC_SCREEN_MAX_DELIVERED_COST_USD_PER_M3 = 60.0  # scenario threshold, see module note below
OUTLOOK_YEARS = 10
NET_STOCK_CHANGE_FRACTION_MEAN = -0.01  # ASSUMED, see build_outlook()
NET_STOCK_CHANGE_FRACTION_STD = 0.03
GLOBAL_DRAWS_SEED = 5000  # ONE fixed seed for the whole run's systemic tier
REGIONAL_DRAWS_BASE_SEED = 9001


def load_catchment(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


_EO_CONDITIONED_PRIORS_CACHE: dict[str, dict[str, float]] | None = None
_DEFAULT_EO_CONDITIONED_PRIORS_PATH: Path | None = None


def set_default_eo_conditioned_priors_path(path: Path | None) -> None:
    """Called once by main() so every run_all_cfrs call in this module
    (including the ones inside build_sensitivity/build_uncertainty_
    decomposition/perturb_and_rerun, which don't take the path themselves)
    uses the SAME EO-conditioned nudges as the baseline run -- otherwise a
    sensitivity/decomposition rerun would silently compare an EO-nudged
    baseline against a non-nudged perturbation."""
    global _DEFAULT_EO_CONDITIONED_PRIORS_PATH
    _DEFAULT_EO_CONDITIONED_PRIORS_PATH = path


def load_eo_conditioned_priors(path: Path | None) -> dict[str, dict[str, float]]:
    """Track v3-10: entity_id -> {forest_cover_multiplier, maturity_multiplier}
    from zurkt_eo_conditioned_priors.py's output. Missing/None path -> empty
    dict, and build_cfr_supply_state defaults every multiplier to 1.0 (no
    nudge) for any CFR not present here -- never silently invents a nudge."""
    global _EO_CONDITIONED_PRIORS_CACHE
    if path is None:
        return {}
    if _EO_CONDITIONED_PRIORS_CACHE is None:
        data = json.loads(path.read_text(encoding="utf-8"))
        _EO_CONDITIONED_PRIORS_CACHE = {
            row["entity_id"]: {
                "forest_cover_multiplier": row["forest_cover_multiplier"],
                "maturity_multiplier": row["maturity_multiplier"],
            }
            for row in data["cfrs"]
        }
    return _EO_CONDITIONED_PRIORS_CACHE


_MATERIAL_CLASS_EVIDENCE_CACHE: dict[str, dict[str, float]] | None = None
_DEFAULT_MATERIAL_CLASS_EVIDENCE_PATH: Path | None = None


def set_default_material_class_evidence_path(path: Path | None) -> None:
    global _DEFAULT_MATERIAL_CLASS_EVIDENCE_PATH
    _DEFAULT_MATERIAL_CLASS_EVIDENCE_PATH = path


def load_material_class_evidence(path: Path | None) -> dict[str, dict[str, float]]:
    """Track v4-5: entity_id -> material-class mixture probabilities
    OVERRIDING zurkt_scenario.DEFAULT_MATERIAL_MIX_PROBS for CFRs with real,
    documented evidence (e.g. a confirmed plantation). Missing/None path ->
    empty dict, and every CFR not present here uses the broad default
    prior -- never silently invents evidence."""
    global _MATERIAL_CLASS_EVIDENCE_CACHE
    if path is None:
        return {}
    if _MATERIAL_CLASS_EVIDENCE_CACHE is None:
        data = json.loads(path.read_text(encoding="utf-8"))
        _MATERIAL_CLASS_EVIDENCE_CACHE = {row["entity_id"]: row["mix_probs"] for row in data["cfrs"]}
    return _MATERIAL_CLASS_EVIDENCE_CACHE


def run_all_cfrs(
    cfrs: list[dict[str, Any]],
    spec_key: str = "STANDARD",
    eo_conditioned_priors_path: Path | None = "__default__",
    material_class_evidence_path: Path | None = "__default__",
    freeze_target: tuple[str, str] | None = None,
) -> list[dict[str, Any]]:
    """Track v3-2/3: samples the SYSTEMIC (global) and REGIONAL tiers ONCE
    per call -- shared identically across every CFR below -- before looping
    over CFRs for their own CFR-SPECIFIC (+ MEASUREMENT-widened) residual
    draws. This is what makes cross-CFR aggregation reflect hierarchical,
    not purely independent, uncertainty."""
    if eo_conditioned_priors_path == "__default__":
        eo_conditioned_priors_path = _DEFAULT_EO_CONDITIONED_PRIORS_PATH
    if material_class_evidence_path == "__default__":
        material_class_evidence_path = _DEFAULT_MATERIAL_CLASS_EVIDENCE_PATH
    global_draws = sample_global_draws(np.random.default_rng(GLOBAL_DRAWS_SEED), N_DRAWS)
    region_ids = [assign_region(cfr["lat"], cfr["lon"]) for cfr in cfrs]
    regional_draws_by_region = sample_regional_draws_by_region(region_ids, N_DRAWS, REGIONAL_DRAWS_BASE_SEED)
    eo_conditioned = load_eo_conditioned_priors(eo_conditioned_priors_path)
    material_class_evidence = load_material_class_evidence(material_class_evidence_path)

    results = []
    for i, cfr in enumerate(cfrs):
        region_id = region_ids[i]
        eo_nudge = eo_conditioned.get(cfr["entity_id"], {})
        material_mix_probs = material_class_evidence.get(cfr["entity_id"])
        freeze_variable = freeze_target[1] if freeze_target is not None and freeze_target[0] == cfr["entity_id"] else None
        state, raw = build_cfr_supply_state(
            entity_id=cfr["entity_id"],
            canonical_name=cfr["canonical_name"],
            gross_area_ha=cfr["area_ha"],
            distance_km=cfr["distance_km"],
            road_km=cfr.get("road_km"),
            route_source=cfr.get("route_source", "unavailable"),
            eo_evidence_status=cfr.get("eo_evidence_status", "not_yet_processed"),
            global_draws=global_draws,
            regional_draws=regional_draws_by_region[region_id],
            region_id=region_id,
            material_mix_probs=material_mix_probs,
            eo_forest_cover_multiplier=eo_nudge.get("forest_cover_multiplier", 1.0),
            eo_maturity_multiplier=eo_nudge.get("maturity_multiplier", 1.0),
            freeze_variable=freeze_variable,
            processor_spec_key=spec_key,
            n_draws=N_DRAWS,
            rng_seed=1000 + i,  # unique per CFR -> independent CFR-SPECIFIC residual only
        )
        results.append({"cfr": cfr, "state": state, "raw": raw})
    return results


def validate_invariants(results: list[dict[str, Any]]) -> list[str]:
    """Track 28. Returns a list of violation messages; empty = clean."""
    violations = []
    for row in results:
        s = row["state"]
        name = s.canonical_name
        for q in ["p10", "p50", "p90"]:
            if not (s.standing_volume_m3[q] >= s.harvestable_volume_m3[q] >= 0):
                violations.append(f"{name}: standing < harvestable at {q}")
        for level in ["standing_volume_m3", "harvestable_volume_m3", "zurkt_suitable_volume_m3"]:
            vals = getattr(s, level)
            if not (vals["p10"] <= vals["p50"] <= vals["p90"]):
                violations.append(f"{name}: {level} quantiles not ordered (p10<=p50<=p90)")
        if s.zurkt_suitable_volume_m3["p90"] > s.harvestable_volume_m3["p90"] * 1.01:
            violations.append(f"{name}: suitable volume exceeds harvestable volume")
        if s.annual_suitable_supply_m3["p90"] > s.zurkt_suitable_volume_m3["p90"] * 1.01:
            violations.append(f"{name}: annual supply exceeds total suitable volume")
        if s.distance_km < 0 or (s.road_km is not None and s.road_km < 0):
            violations.append(f"{name}: negative distance")
        for cost_field in ["procurement_cost_usd_per_m3", "harvest_extract_load_cost_usd_per_m3", "haulage_cost_usd_per_m3", "regulatory_admin_cost_usd_per_m3", "delivered_cost_usd_per_m3"]:
            vals = getattr(s, cost_field)
            if vals["p50"] < 0:
                violations.append(f"{name}: negative {cost_field}")
    return violations


def build_supply_curve(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Track 11. Ranked by P50 delivered cost; cumulative annual suitable
    supply. Both the curve's cumulative column and the cost-threshold
    table below are built from a (n_cfrs x n_draws) matrix of each CFR's
    OWN raw annual-supply draws, ordered by cost rank, with np.cumsum
    down the CFR axis -- THEN quantiles are taken of each row. This is
    the same "sum draws first, then quantile" order used for the
    top-level aggregate and for build_outlook()'s year-1 figure; summing
    each CFR's own P50 instead (the previous approach here) understates
    the true joint P50 for right-skewed marginals, and produced a
    cumulative total at the $100/m3 threshold that silently disagreed
    with the aggregate P50 reported elsewhere on the same dashboard --
    exactly the inconsistency this function must not reintroduce. By
    construction, the final row's P50 here equals aggregate_p50 below
    (same underlying matrix) -- asserted below, not merely assumed."""
    ranked = sorted(results, key=lambda r: r["state"].delivered_cost_usd_per_m3["p50"])
    draws_by_rank = np.array([r["raw"]["raw_annual_suitable_supply_m3"] for r in ranked])  # (n_cfrs, n_draws)
    cumulative_draws = np.cumsum(draws_by_rank, axis=0)  # (n_cfrs, n_draws), row i = sum of the i+1 cheapest CFRs
    cumulative_quantiles = np.percentile(cumulative_draws, [10, 50, 90], axis=1)  # (3, n_cfrs)

    points = []
    for i, row in enumerate(ranked):
        s = row["state"]
        points.append(
            {
                "entity_id": s.entity_id,
                "canonical_name": s.canonical_name,
                "delivered_cost_usd_per_m3_p50": s.delivered_cost_usd_per_m3["p50"],
                "annual_suitable_supply_m3_p50": round(s.annual_suitable_supply_m3["p50"], 1),
                "cumulative_annual_supply_m3_p10": round(float(cumulative_quantiles[0, i]), 1),
                "cumulative_annual_supply_m3_p50": round(float(cumulative_quantiles[1, i]), 1),
                "cumulative_annual_supply_m3_p90": round(float(cumulative_quantiles[2, i]), 1),
            }
        )

    # Aggregate P10/P50/P90: the last row of the SAME cumulative-draws
    # matrix used for the curve above -- not recomputed independently, so
    # curve and aggregate can never silently disagree.
    aggregate_draws = cumulative_draws[-1]
    aggregate_p10, aggregate_p50, aggregate_p90 = (
        round(float(v), 1) for v in np.percentile(aggregate_draws, [10, 50, 90])
    )

    thresholds_usd_per_m3 = [20, 30, 40, 50, 60, 80, 100]
    volume_below_threshold = []
    for t in thresholds_usd_per_m3:
        n_below = sum(1 for r in ranked if r["state"].delivered_cost_usd_per_m3["p50"] <= t)
        if n_below == 0:
            volume_below_threshold.append(
                {
                    "delivered_cost_threshold_usd_per_m3": t,
                    "contributing_cfrs": 0,
                    "cumulative_annual_supply_m3_p10": 0.0,
                    "cumulative_annual_supply_m3_p50": 0.0,
                    "cumulative_annual_supply_m3_p90": 0.0,
                }
            )
            continue
        below_draws = cumulative_draws[n_below - 1]  # cumsum row for the n_below cheapest CFRs
        p10, p50, p90 = (round(float(v), 1) for v in np.percentile(below_draws, [10, 50, 90]))
        volume_below_threshold.append(
            {
                "delivered_cost_threshold_usd_per_m3": t,
                "contributing_cfrs": n_below,
                "cumulative_annual_supply_m3_p10": p10,
                "cumulative_annual_supply_m3_p50": p50,
                "cumulative_annual_supply_m3_p90": p90,
            }
        )

    # Reconciliation invariant (sprint requirement): the curve's own
    # terminal cumulative P50 must equal the aggregate P50 reported
    # alongside it. Both are derived from the same matrix here, but the
    # check is asserted -- not merely assumed correct by construction --
    # so a future refactor that breaks the shared derivation aborts the
    # run instead of silently reintroducing the contradiction.
    if points:
        terminal_p50 = points[-1]["cumulative_annual_supply_m3_p50"]
        if abs(terminal_p50 - aggregate_p50) > max(1.0, 0.001 * aggregate_p50):
            raise SystemExit(
                f"Aborting: supply curve terminal cumulative P50 ({terminal_p50}) does not match "
                f"aggregate P50 ({aggregate_p50}) within tolerance -- reconciliation invariant violated."
            )

    marginal = points[-1] if points else None

    # Source concentration answers "how much do we depend on our biggest few
    # suppliers" -- that means ranked by SUPPLY VOLUME, not by delivered
    # cost. `points` above is cost-ranked (for the curve's own x-axis); an
    # earlier version of this function summed points[:5] directly and
    # silently reported the 5 CHEAPEST CFRs' combined share instead of the 5
    # BIGGEST suppliers' share -- those can be (and were) very different
    # populations, and "0% concentration" from the cheap-first ranking
    # looked like a low-risk reading while the single largest supplier
    # (Mabira) alone was ~14% of aggregate P50 supply.
    by_volume = sorted(results, key=lambda r: r["state"].annual_suitable_supply_m3["p50"], reverse=True)
    top1_by_volume = by_volume[0]["state"].annual_suitable_supply_m3["p50"] if by_volume else 0.0
    top5_by_volume = sum(r["state"].annual_suitable_supply_m3["p50"] for r in by_volume[:5])
    top10_by_volume = sum(r["state"].annual_suitable_supply_m3["p50"] for r in by_volume[:10])
    top1_share = round(top1_by_volume / aggregate_p50, 3) if aggregate_p50 else None
    top5_share = round(top5_by_volume / aggregate_p50, 3) if aggregate_p50 else None
    top10_share = round(top10_by_volume / aggregate_p50, 3) if aggregate_p50 else None

    # Invariants (sprint requirement): concentration shares must nest
    # (top1 <= top5 <= top10 <= 1); top5 is by construction the sum of
    # the five largest individual shares (same sorted list), so that half
    # of the requirement holds structurally rather than needing a
    # separate check.
    if top1_share is not None and top5_share is not None and top10_share is not None:
        if not (top1_share <= top5_share <= top10_share <= 1.0 + 1e-9):
            raise SystemExit(
                f"Aborting: source concentration invariant violated -- "
                f"top1={top1_share} top5={top5_share} top10={top10_share} (expected top1<=top5<=top10<=1)."
            )

    return {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "ranking_basis": "P50 delivered cost ascending (per-CFR quantile, not a joint aggregate distribution)",
        "cumulative_method": "cumsum of raw per-CFR draws (ordered by cost rank), quantiles taken per cumulative row -- "
        "not sum of per-CFR P50 quantiles. See build_supply_curve() docstring.",
        "points": points,
        "aggregate_annual_suitable_supply_m3": {
            "p10": round(aggregate_p10, 1), "p50": round(aggregate_p50, 1), "p90": round(aggregate_p90, 1),
        },
        "volume_below_cost_threshold": volume_below_threshold,
        "source_concentration": {
            "top1_cfr_share_of_p50_supply": top1_share,
            "top5_cfrs_share_of_p50_supply": top5_share,
            "top10_cfrs_share_of_p50_supply": top10_share,
            "note": "Ranked by each CFR's own P50 annual supply (largest first), not by delivered cost -- "
            "concentration measures dependence on the biggest few suppliers. Shares are against the joint "
            "aggregate P50 (same cumulative-draws matrix as the curve above), so this is consistent with the "
            "curve's own terminal value.",
        },
        "marginal_cfr": marginal,
    }


def build_outlook(results: list[dict[str, Any]], years: int = OUTLOOK_YEARS) -> dict[str, Any]:
    """Track 12. A first, deliberately simple temporal model: available
    stock compounds year over year by an ASSUMED net stock-change fraction
    (harvest minus regrowth), and each year's harvest is drawn from the
    same annual-harvest-fraction prior applied to that year's available
    stock. This is NOT a real age-structured cohort growth model -- no
    real age-class or growth-rate data exists for any of these CFRs -- but
    it is a genuine, reproducible Monte Carlo, not a flat repeat of year 1."""
    rng = np.random.default_rng(4242)
    n = N_DRAWS
    # Aggregate stock at t=0 uses the SAME "Zurkt-suitable" volume (already
    # net of commercial-availability and grade-fit) as the delivered-cost
    # supply curve -- not the coarser "harvestable" volume, which omits
    # both reductions. Using a different base here than the curve uses
    # would make year-1 of this outlook inconsistent with the curve's own
    # aggregate annual-supply figure for what should be the same quantity.
    stock0 = np.sum([r["raw"]["raw_zurkt_suitable_volume_m3"] for r in results], axis=0)

    net_change = np.clip(
        rng.normal(NET_STOCK_CHANGE_FRACTION_MEAN, NET_STOCK_CHANGE_FRACTION_STD, size=n),
        -0.15, 0.15,
    )
    annual_harvest_frac = PRIORS_ANNUAL_HARVEST_FRACTION.sample(rng, n)

    stock = stock0.copy()
    yearly = []
    cumulative = np.zeros(n)
    for year in range(1, years + 1):
        harvest = np.maximum(stock, 0.0) * annual_harvest_frac
        cumulative += harvest
        stock = np.maximum(stock - harvest, 0.0) * (1.0 + net_change)
        yearly.append(
            {
                "year": year,
                "annual_supply_m3": quantiles(harvest),
                "cumulative_supply_m3": quantiles(cumulative),
                "remaining_stock_m3": quantiles(stock),
            }
        )

    return {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "assumptions": {
            "net_annual_stock_change_fraction": {
                "mean": NET_STOCK_CHANGE_FRACTION_MEAN, "std": NET_STOCK_CHANGE_FRACTION_STD,
                "rationale": "ASSUMED. No real growth-rate or harvest-scheduling data exists for any "
                "catchment CFR. Centered slightly negative (net depletion under harvest exceeding "
                "regrowth, absent active silviculture) but within a band wide enough to include net "
                "growth. This is a modelling placeholder, not a measured rate.",
            },
            "annual_harvest_fraction": PRIORS_ANNUAL_HARVEST_FRACTION.rationale,
        },
        "year_0_available_stock_m3": quantiles(stock0),
        "years": yearly,
    }


AGE_CLASSES = ["seedling", "young", "mid", "mature", "old"]
# Broad ASSUMED prior: no real age-class survey exists for any of these 276
# CFRs. Weighted toward mid/mature (a plausible natural/mixed estate without
# active plantation-style even-aged management), not toward young growth --
# documented as a placeholder, not a measurement.
DEFAULT_AGE_CLASS_VOLUME_FRACTIONS = {"seedling": 0.05, "young": 0.15, "mid": 0.30, "mature": 0.35, "old": 0.15}
# Expected years spent in each class before "graduating" to the next (used
# as a per-year transition PROBABILITY = 1/duration) -- ASSUMED generic
# tropical mixed-forest growth pacing, not species- or CFR-specific.
AGE_CLASS_DURATION_YEARS = {"seedling": 5, "young": 10, "mid": 15, "mature": 30, "old": None}
HARVEST_ELIGIBLE_CLASSES = ["mature", "old"]
REGEN_CREDIT_FRACTION = 0.02  # ASSUMED: regenerated stands start near-zero volume, not a 1:1 area replacement


def build_age_structured_outlook(results: list[dict[str, Any]], years: int = OUTLOOK_YEARS) -> dict[str, Any]:
    """Track v4-9: the first genuine AGE-STRUCTURED cohort model, alongside
    (not replacing) the depletion stress test above. Splits the same t=0
    aggregate stock (raw_zurkt_suitable_volume_m3, identical basis to
    build_outlook()) into 5 age classes via a broad ASSUMED prior, harvests
    only from the two oldest (harvest-eligible) classes each year, and
    explicitly models growth as a per-class transition into the next class
    plus a small regeneration credit into the youngest class from harvested
    volume. This is still NOT a calibrated forecast -- no real age-class
    survey, growth-rate, or harvest-scheduling data exists for any of these
    276 CFRs -- so it is labeled an AGE-STRUCTURED SCENARIO OUTLOOK, not a
    forecast, exactly like the depletion stress test it sits alongside."""
    rng = np.random.default_rng(4343)
    n = N_DRAWS
    stock0 = np.sum([r["raw"]["raw_zurkt_suitable_volume_m3"] for r in results], axis=0)
    annual_harvest_frac = PRIORS_ANNUAL_HARVEST_FRACTION.sample(rng, n)

    class_volume = {c: stock0 * frac for c, frac in DEFAULT_AGE_CLASS_VOLUME_FRACTIONS.items()}
    transition_rate = {c: (1.0 / d if d else 0.0) for c, d in AGE_CLASS_DURATION_YEARS.items()}

    yearly = []
    cumulative = np.zeros(n)
    for year in range(1, years + 1):
        harvestable = class_volume["mature"] + class_volume["old"]
        harvest = np.maximum(harvestable, 0.0) * annual_harvest_frac
        cumulative += harvest
        harvestable_safe = np.maximum(harvestable, 1e-9)
        for c in HARVEST_ELIGIBLE_CLASSES:
            share = class_volume[c] / harvestable_safe
            class_volume[c] = np.maximum(class_volume[c] - harvest * share, 0.0)

        new_volume = {
            "old": class_volume["old"] + class_volume["mature"] * transition_rate["mature"],
            "mature": class_volume["mature"] * (1.0 - transition_rate["mature"]) + class_volume["mid"] * transition_rate["mid"],
            "mid": class_volume["mid"] * (1.0 - transition_rate["mid"]) + class_volume["young"] * transition_rate["young"],
            "young": class_volume["young"] * (1.0 - transition_rate["young"]) + class_volume["seedling"] * transition_rate["seedling"],
            "seedling": class_volume["seedling"] * (1.0 - transition_rate["seedling"]) + harvest * REGEN_CREDIT_FRACTION,
        }
        class_volume = new_volume
        total_stock = sum(class_volume.values())

        yearly.append(
            {
                "year": year,
                "annual_supply_m3": quantiles(harvest),
                "cumulative_supply_m3": quantiles(cumulative),
                "remaining_stock_m3": quantiles(total_stock),
                "age_class_volume_m3": {c: quantiles(v) for c, v in class_volume.items()},
            }
        )

    return {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "label": "AGE-STRUCTURED SCENARIO OUTLOOK -- not a calibrated forecast (see assumptions below)",
        "assumptions": {
            "age_class_volume_fractions_t0": DEFAULT_AGE_CLASS_VOLUME_FRACTIONS,
            "age_class_duration_years": AGE_CLASS_DURATION_YEARS,
            "harvest_eligible_classes": HARVEST_ELIGIBLE_CLASSES,
            "regeneration_credit_fraction": REGEN_CREDIT_FRACTION,
            "rationale": "ASSUMED. No real age-class survey, growth-rate, or harvest-scheduling data exists for "
            "any of these 276 CFRs. Age-class split, transition durations and regeneration credit are broad, "
            "generic tropical mixed-forest placeholders -- this model is structurally richer than the flat "
            "depletion stress test (real growth/harvest/regeneration dynamics by age class) but is NOT more "
            "empirically calibrated. Compare its year-1 and year-10 figures against the depletion stress test's "
            "as two different structural assumptions, not as a forecast vs. a stress test.",
        },
        "year_0_available_stock_m3": quantiles(stock0),
        "years": yearly,
    }


def perturb_and_rerun(cfrs: list[dict[str, Any]], base_results: list[dict[str, Any]], perturbation_key: str) -> dict[str, float]:
    """Track 14. Re-run the full CFR set under one perturbation, compare
    aggregate P50 annual supply and P50 delivered cost against base."""
    import app.services.supply.zurkt_scenario as zs

    base_priors = {k: v for k, v in zs.PRIORS.items()}
    base_annual_prior = zs.PRIORS_ANNUAL_HARVEST_FRACTION
    spec_key = "STANDARD"
    extra_haul_factor = 1.0

    try:
        if perturbation_key == "fuel_plus_20pct":
            # Fuel price table is read from roundwood_production's own
            # retail_nonlab_items() at import time; scale via a temporary
            # monkeypatch of the sampled price fraction is not exposed, so
            # approximate by scaling the resulting cost post hoc (fuel is
            # embedded in every cost line's non-labour price draw -- a
            # clean per-line toggle would require refactoring
            # zurkt_scenario's cost block to expose a fuel multiplier;
            # documented here as a v1 approximation, not hidden).
            cfrs_mod = cfrs
            results = run_all_cfrs(cfrs_mod, spec_key)
            for row in results:
                for q in row["state"].delivered_cost_usd_per_m3:
                    row["state"].delivered_cost_usd_per_m3[q] *= 1.10  # fuel is a fraction of total logistics cost; see note above
        elif perturbation_key == "availability_lower":
            zs.PRIORS["commercial_availability_fraction"] = zs.Prior(
                "beta", {"a": 1.5, "b": 6}, "Sensitivity case: lower commercial availability."
            )
            results = run_all_cfrs(cfrs, spec_key)
        elif perturbation_key == "stocked_fraction_lower":
            zs.PRIORS["stocked_fraction"] = zs.Prior("beta", {"a": 2, "b": 5}, "Sensitivity case: lower stocked fraction.")
            results = run_all_cfrs(cfrs, spec_key)
        elif perturbation_key == "standing_volume_lower":
            zs.PRIORS["mean_tree_dbh_cm"] = zs.Prior("normal", {"mean": 18.0, "std": 6.0, "min": 5.0}, "Sensitivity case: lower DBH.")
            zs.PRIORS["mean_tree_height_m"] = zs.Prior("normal", {"mean": 10.0, "std": 4.0, "min": 3.0}, "Sensitivity case: lower height.")
            results = run_all_cfrs(cfrs, spec_key)
        elif perturbation_key == "grade_recovery_lower_large_log_strict":
            results = run_all_cfrs(cfrs, "LARGE_LOG_STRICT")
        elif perturbation_key == "road_distance_penalty_20pct":
            cfrs_mod = [dict(c, road_km=(c.get("road_km") * 1.2 if c.get("road_km") else None), distance_km=c["distance_km"] * 1.2) for c in cfrs]
            results = run_all_cfrs(cfrs_mod, spec_key)
        else:
            raise ValueError(perturbation_key)

        agg_supply_p50 = sum(r["state"].annual_suitable_supply_m3["p50"] for r in results)
        agg_cost_p50 = float(np.mean([r["state"].delivered_cost_usd_per_m3["p50"] for r in results]))
        return {"aggregate_annual_supply_m3_p50": round(agg_supply_p50, 1), "mean_delivered_cost_usd_per_m3_p50": round(agg_cost_p50, 2)}
    finally:
        zs.PRIORS.clear()
        zs.PRIORS.update(base_priors)
        zs.PRIORS_ANNUAL_HARVEST_FRACTION = base_annual_prior


def build_sensitivity(cfrs: list[dict[str, Any]], base_results: list[dict[str, Any]]) -> dict[str, Any]:
    base_supply = sum(r["state"].annual_suitable_supply_m3["p50"] for r in base_results)
    base_cost = float(np.mean([r["state"].delivered_cost_usd_per_m3["p50"] for r in base_results]))

    cases = [
        "fuel_plus_20pct",
        "availability_lower",
        "stocked_fraction_lower",
        "standing_volume_lower",
        "grade_recovery_lower_large_log_strict",
        "road_distance_penalty_20pct",
    ]
    rows = []
    for case in cases:
        out = perturb_and_rerun(cfrs, base_results, case)
        rows.append(
            {
                "perturbation": case,
                **out,
                "supply_change_pct": round(100 * (out["aggregate_annual_supply_m3_p50"] - base_supply) / base_supply, 1) if base_supply else None,
                "cost_change_pct": round(100 * (out["mean_delivered_cost_usd_per_m3_p50"] - base_cost) / base_cost, 1) if base_cost else None,
            }
        )
    rows.sort(key=lambda r: abs(r["supply_change_pct"] or 0), reverse=True)
    return {
        "base_case": {"aggregate_annual_supply_m3_p50": round(base_supply, 1), "mean_delivered_cost_usd_per_m3_p50": round(base_cost, 2)},
        "one_variable_sensitivities": rows,
        "ranked_by": "absolute pct change in aggregate P50 annual supply",
    }


def build_verification_priorities(results: list[dict[str, Any]], top_n: int = 15) -> dict[str, Any]:
    """Track 15. Transparent approximation (not formal EVSI): sensitivity
    proxy (P90-P10 spread as a fraction of P50) x commercial contribution
    (this CFR's P50 supply share of the aggregate)."""
    total_p50 = sum(r["state"].annual_suitable_supply_m3["p50"] for r in results) or 1.0
    scored = []
    for row in results:
        s = row["state"]
        p50 = max(s.zurkt_suitable_volume_m3["p50"], 1e-6)
        uncertainty = (s.zurkt_suitable_volume_m3["p90"] - s.zurkt_suitable_volume_m3["p10"]) / p50
        contribution = s.annual_suitable_supply_m3["p50"] / total_p50
        score = uncertainty * contribution
        scored.append(
            {
                "entity_id": s.entity_id,
                "canonical_name": s.canonical_name,
                "value_of_information_proxy": round(float(score), 5),
                "relative_uncertainty_cv": round(float(uncertainty), 3),
                "commercial_contribution_share": round(float(contribution), 4),
                "distance_km": s.distance_km,
                "road_km": s.road_km,
                "eo_evidence_status": s.eo_evidence_status,
                "recommended_field_variables": [
                    "stocked area (ground-truth vs. relevant_forest_fraction/stocked_fraction priors)",
                    "age/maturity class (mature_harvestable_fraction)",
                    "species composition (grading/pricing currently assumes eucalyptus-equivalent)",
                    "DBH distribution (mean and within-stand spread)",
                    "commercial/legal access status (never inferable from EO)",
                ],
            }
        )
    scored.sort(key=lambda r: r["value_of_information_proxy"], reverse=True)
    return {
        "method": "Transparent approximation: (P90-P10)/P50 uncertainty x share of aggregate P50 supply. "
        "Not a formal EVSI/EVPI calculation -- no decision-utility function is defined yet to support one.",
        "top_verification_targets": scored[:top_n],
    }


EVSI_VARIABLE_KEYS = ["access_legal_status", "stocked_fraction", "maturity", "species_processor_fit"]
EVSI_RECOMMENDED_METHOD = {
    "access_legal_status": "document/legal verification (permit, NFA management-plan, concession registry check)",
    "stocked_fraction": "rapid reconnaissance transect + drone/very-high-res imagery over the CFR polygon",
    "maturity": "rapid reconnaissance + a small DBH/age-class plot sample",
    "species_processor_fit": "species survey (transect) + a DBH sample matched against Evergreen's veneer-log requirements",
}
EVSI_REFERENCE_DEMAND_M3_PER_YEAR = 150_000  # a mid-ladder demand level, not the largest or smallest


def build_evsi(cfrs: list[dict[str, Any]], base_results: list[dict[str, Any]], base_dispatch: dict[str, Any], top_n_cfrs: int = 5) -> dict[str, Any]:
    """Track v3-15/16. For the top N CFRs (by the existing VOI-proxy
    ranking) x all 4 candidate verification variables, simulate 'perfect
    information about this CFR's true value of this one variable' (see
    zurkt_scenario.build_cfr_supply_state's freeze_variable) and measure
    the resulting change in expected shortfall at a reference demand level
    -- an actual decision-relevant re-simulation, not merely a variance
    proxy. Ranks CFR+VARIABLE pairs, not just CFRs."""
    base_row = next(r for r in base_dispatch["demand_reliability"] if r["demand_m3_per_year"] == EVSI_REFERENCE_DEMAND_M3_PER_YEAR)
    base_shortfall = base_row["expected_shortfall_m3"]
    base_p_meets = base_row["p_supply_meets_demand"]

    verification_ranking = build_verification_priorities(base_results, top_n=top_n_cfrs)["top_verification_targets"]

    rows = []
    for target in verification_ranking:
        entity_id = target["entity_id"]
        for variable_key in EVSI_VARIABLE_KEYS:
            frozen_results = run_all_cfrs(cfrs, "STANDARD", freeze_target=(entity_id, variable_key))
            frozen_dispatch = build_drawwise_dispatch(frozen_results, demand_levels=[EVSI_REFERENCE_DEMAND_M3_PER_YEAR])
            frozen_row = frozen_dispatch["demand_reliability"][0]
            shortfall_reduction = base_shortfall - frozen_row["expected_shortfall_m3"]
            rows.append(
                {
                    "entity_id": entity_id,
                    "canonical_name": target["canonical_name"],
                    "variable": variable_key,
                    "base_expected_shortfall_m3": base_shortfall,
                    "post_verification_expected_shortfall_m3": frozen_row["expected_shortfall_m3"],
                    "expected_shortfall_reduction_m3": round(shortfall_reduction, 1),
                    "base_p_supply_meets_demand": base_p_meets,
                    "post_verification_p_supply_meets_demand": frozen_row["p_supply_meets_demand"],
                    "reliability_gain": round(frozen_row["p_supply_meets_demand"] - base_p_meets, 4),
                    "recommended_method": EVSI_RECOMMENDED_METHOD[variable_key],
                }
            )
    rows.sort(key=lambda r: r["expected_shortfall_reduction_m3"], reverse=True)
    return {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "reference_demand_m3_per_year": EVSI_REFERENCE_DEMAND_M3_PER_YEAR,
        "method": "For each of the top-VOI CFRs x 4 candidate variables, re-simulate the FULL model with that "
        "CFR's one variable collapsed to its own realized mean (i.e. as if perfectly verified), everything else "
        "left stochastic, and re-run the draw-wise dispatch at the reference demand level. Ranked by the "
        "resulting reduction in expected shortfall -- an actual decision re-simulation, not a variance proxy.",
        "ranked_cfr_variable_pairs": rows,
    }


def build_field_programme(evsi: dict[str, Any], top_n: int = 10) -> dict[str, Any]:
    """Track v3-16: a practical field verification plan from the EVSI
    ranking -- matches METHOD to the kind of uncertainty (never sends an
    inventory crew to resolve a legal-status question)."""
    top_pairs = evsi["ranked_cfr_variable_pairs"][:top_n]
    plan = []
    for i, pair in enumerate(top_pairs):
        plan.append(
            {
                "priority": i + 1,
                "canonical_name": pair["canonical_name"],
                "entity_id": pair["entity_id"],
                "variable_to_measure": pair["variable"],
                "why": (
                    f"Verifying this variable for {pair['canonical_name']} is expected to reduce shortfall at "
                    f"{EVSI_REFERENCE_DEMAND_M3_PER_YEAR:,} m3/yr demand by ~{pair['expected_shortfall_reduction_m3']:,.0f} m3 "
                    f"(reliability {pair['base_p_supply_meets_demand']:.0%} -> {pair['post_verification_p_supply_meets_demand']:.0%})."
                ),
                "spatial_target": pair["entity_id"],
                "recommended_method": pair["recommended_method"],
                "expected_decision_impact": {
                    "expected_shortfall_reduction_m3": pair["expected_shortfall_reduction_m3"],
                    "reliability_gain": pair["reliability_gain"],
                },
            }
        )
    return {
        "reference_demand_m3_per_year": EVSI_REFERENCE_DEMAND_M3_PER_YEAR,
        "note": "Method is matched to the uncertainty type -- legal/access questions get document/legal "
        "verification, never an inventory crew; stocking/species questions get reconnaissance or plot sampling.",
        "plan": plan,
    }


DEMAND_LADDER_M3_PER_YEAR = [25_000, 50_000, 100_000, 150_000, 200_000, 300_000]


def build_technical_potential(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Track v3-1: fixes the bug flagged explicitly by the sprint -- the
    prior report's technical-potential P10/P50/P90 were a sum of each CFR's
    own quantiles (sum(P50_i) etc.), which is a conservative-ish BOUND, not
    a true distribution quantile, and is inconsistent with how every other
    aggregate in this pipeline is computed. Fixed the same way as the
    commercially-addressable aggregate: sum RAW per-draw arrays first (here,
    raw_harvestable_volume_m3 -- pre-access-screen biophysical potential),
    THEN take quantiles of the joint sum."""
    aggregate_draws = np.sum([r["raw"]["raw_harvestable_volume_m3"] for r in results], axis=0)
    return {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "method": "sum of raw per-CFR harvestable-volume draws, THEN quantiles of the joint sum -- "
        "NOT sum(P10_i)/sum(P50_i)/sum(P90_i) (that was the v2 bug; see build_technical_potential() docstring).",
        "technical_potential_m3": quantiles(aggregate_draws),
    }


def build_drawwise_dispatch(results: list[dict[str, Any]], demand_levels: list[int] = DEMAND_LADDER_M3_PER_YEAR) -> dict[str, Any]:
    """Track v3-5: upgrades demand reliability from ranking CFRs ONCE by
    P50 delivered cost to a genuine per-Monte-Carlo-world dispatch. For
    EVERY draw j independently: rank all 276 CFRs by THEIR OWN delivered
    cost in world j (not the P50 cost), cumulatively sum their supply in
    that same order, and read off (for each demand level) how many CFRs
    world j needed and at what marginal cost. This is strictly stronger
    than ranking once by P50 cost: it lets a CFR that happens to be cheap
    in a below-average-cost world contribute earlier in THAT world's
    dispatch, and lets source-count/marginal-cost/concentration come out
    as full distributions instead of single point reads off one curve.

    Because delivered cost and annual supply for every CFR were built from
    the SAME hierarchical draws (see zurkt_scenario.build_cfr_supply_state),
    correlated systemic/regional effects are automatically reflected here
    too -- a high-fuel-price world raises cost for every CFR simultaneously,
    which changes the RELATIVE ranking far less than it changes the
    absolute cost level, exactly as it should.
    """
    n_cfrs = len(results)
    cost_matrix = np.array([r["raw"]["raw_delivered_cost_usd_per_m3"] for r in results])  # (n_cfrs, n_draws)
    supply_matrix = np.array([r["raw"]["raw_annual_suitable_supply_m3"] for r in results])  # (n_cfrs, n_draws)
    entity_ids = [r["state"].entity_id for r in results]

    order = np.argsort(cost_matrix, axis=0)  # per-draw cost rank
    sorted_cost = np.take_along_axis(cost_matrix, order, axis=0)
    sorted_supply = np.take_along_axis(supply_matrix, order, axis=0)
    cum_supply = np.cumsum(sorted_supply, axis=0)  # (n_cfrs, n_draws)
    total_supply_per_draw = cum_supply[-1, :]

    # Concentration: a SEPARATE per-draw ranking by volume (largest supplier
    # first), not the cost ranking above -- same distinction already made
    # for the P50-only version, now as full per-draw distributions.
    vol_order = np.argsort(-supply_matrix, axis=0)
    sorted_by_vol = np.take_along_axis(supply_matrix, vol_order, axis=0)
    total_safe = np.maximum(total_supply_per_draw, 1e-9)
    top1_share_per_draw = sorted_by_vol[0, :] / total_safe
    top5_share_per_draw = sorted_by_vol[: min(5, n_cfrs), :].sum(axis=0) / total_safe
    top10_share_per_draw = sorted_by_vol[: min(10, n_cfrs), :].sum(axis=0) / total_safe

    demand_rows = []
    for d in demand_levels:
        reaches = cum_supply >= d  # (n_cfrs, n_draws)
        any_reach = reaches.any(axis=0)
        first_idx = np.argmax(reaches, axis=0)  # 0 where never True -- masked out below via any_reach
        shortfall = np.maximum(d - total_supply_per_draw, 0.0)

        source_count = np.where(any_reach, first_idx + 1, np.nan).astype(float)
        marginal_cost = np.where(any_reach, np.take_along_axis(sorted_cost, first_idx[None, :], axis=0)[0], np.nan)

        def _nanq(arr: np.ndarray) -> dict[str, float | None]:
            if np.all(np.isnan(arr)):
                return {"p10": None, "p50": None, "p90": None}
            p10, p50, p90 = np.nanpercentile(arr, [10, 50, 90])
            return {"p10": round(float(p10), 1), "p50": round(float(p50), 1), "p90": round(float(p90), 1)}

        demand_rows.append(
            {
                "demand_m3_per_year": d,
                "p_supply_meets_demand": round(float(np.mean(any_reach)), 3),
                "expected_shortfall_m3": round(float(np.mean(shortfall)), 1),
                "shortfall_m3": quantiles(shortfall),
                "required_source_cfr_count": _nanq(source_count),
                "marginal_delivered_cost_usd_per_m3": _nanq(marginal_cost),
            }
        )

    return {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "method": "Draw-wise economic dispatch (Track v3-5): every Monte Carlo world ranks all CFRs by ITS OWN "
        "delivered cost, dispatches cheapest-first, and every reported quantity (required source count, marginal "
        "cost, shortfall, concentration) is a distribution over worlds -- not a single read-off of one P50-ranked "
        "curve. This is the correct dispatch to use for demand reliability; the P50-cost-ranked "
        "zurkt-delivered-supply-curve remains useful as a single illustrative curve but understates dispatch "
        "variability across worlds.",
        "demand_scenarios_m3_per_year": demand_levels,
        "demand_reliability": demand_rows,
        "source_concentration_distribution": {
            "top1_share": quantiles(top1_share_per_draw),
            "top5_share": quantiles(top5_share_per_draw),
            "top10_share": quantiles(top10_share_per_draw),
            "note": "Per-draw shares of the joint aggregate supply held by the single largest / top 5 / top 10 "
            "suppliers in THAT world -- a distribution, not the single P50-based figure in the supply curve.",
        },
        "aggregate_annual_suitable_supply_m3": quantiles(total_supply_per_draw),
    }


UNCERTAINTY_GROUPS: dict[str, dict[str, list[str]]] = {
    "access_legal": {"priors": ["commercial_availability_fraction"], "globals": []},
    "forested_stocked_fraction": {"priors": ["relevant_forest_fraction", "stocked_fraction"], "globals": ["GLOBAL_STOCKING_MODEL_BIAS_PRIOR", "REGIONAL_STOCKED_MULTIPLIER_PRIOR"]},
    "maturity": {"priors": ["mature_harvestable_fraction"], "globals": ["REGIONAL_MATURITY_MULTIPLIER_PRIOR"]},
    "species_grade_recovery": {"priors": ["within_stand_dbh_cv"], "globals": ["GLOBAL_GRADE_RECOVERY_DBH_BIAS_PRIOR"]},
    "procurement_price": {"priors": ["stumpage_price_usd_per_m3"], "globals": []},
    "haulage": {"priors": [], "globals": ["AVG_TRUCK_SPEED_KMPH_PRIOR", "GLOBAL_FUEL_PRICE_LAMBDA_PRIOR"]},
    "growth_stocking_stand": {"priors": ["stems_per_ha", "mean_tree_dbh_cm", "mean_tree_height_m"], "globals": []},
}


def _frozen_prior(prior: Any) -> Any:
    """Collapse a Prior to (approximately) a point mass at its own mean --
    used both for uncertainty decomposition (Track v3-18) and, per-CFR, for
    EVSI (Track v3-15): 'if this quantity were perfectly known, how much
    would the decision-relevant output change.'"""
    import app.services.supply.zurkt_scenario as zs

    if prior.kind == "beta":
        mean = prior.params["a"] / (prior.params["a"] + prior.params["b"])
        conc = 1_000_000.0
        return zs.Prior("beta", {"a": mean * conc, "b": (1 - mean) * conc}, "FROZEN for decomposition/EVSI: collapsed to its prior mean.")
    new_params = dict(prior.params)
    new_params["std"] = 1e-9
    return zs.Prior("normal", new_params, "FROZEN for decomposition/EVSI: collapsed to its prior mean.")


def freeze_groups_and_rerun(cfrs: list[dict[str, Any]], group_keys: list[str]) -> np.ndarray:
    """Rerun the full model with every Prior in ALL of the given uncertainty
    GROUPS collapsed to its own mean simultaneously (see UNCERTAINTY_GROUPS),
    everything else left stochastic, and return the joint aggregate
    annual-supply draws. Freezing more than one group at once is what makes
    a proper Shapley-value allocation possible (Track v4-1) -- a single-
    group version of this is also what the grouped-collapse sensitivity
    test below uses."""
    import app.services.supply.zurkt_scenario as zs

    all_prior_keys = [k for gk in group_keys for k in UNCERTAINTY_GROUPS[gk]["priors"]]
    all_global_names = [n for gk in group_keys for n in UNCERTAINTY_GROUPS[gk]["globals"]]
    base_priors = {k: zs.PRIORS[k] for k in all_prior_keys}
    base_globals = {name: getattr(zs, name) for name in all_global_names}
    try:
        for key in all_prior_keys:
            zs.PRIORS[key] = _frozen_prior(base_priors[key])
        for name in all_global_names:
            setattr(zs, name, _frozen_prior(base_globals[name]))
        results = run_all_cfrs(cfrs, "STANDARD")
        return np.sum([r["raw"]["raw_annual_suitable_supply_m3"] for r in results], axis=0)
    finally:
        for key, val in base_priors.items():
            zs.PRIORS[key] = val
        for name, val in base_globals.items():
            setattr(zs, name, val)


def freeze_group_and_rerun(cfrs: list[dict[str, Any]], group_key: str) -> np.ndarray:
    return freeze_groups_and_rerun(cfrs, [group_key])


def build_uncertainty_decomposition(cfrs: list[dict[str, Any]], base_results: list[dict[str, Any]]) -> dict[str, Any]:
    """Track v3-18 / v4-1 FIX. The prior report's grouped-collapse numbers
    were mislabeled '% of variance' -- they are NOT an additive partition
    (groups interact, so single-group collapses overlap and can sum to more
    than the total baseline variance). Every field here is now explicitly
    named and documented as a MARGINAL, non-additive sensitivity: 'how much
    would aggregate-supply variance shrink if THIS ONE uncertainty family,
    and only this one, were fully resolved -- with every other family still
    stochastic.' Use build_shapley_decomposition() (below) for a headline
    attribution that IS built to sum to ~100% of the resolvable variance."""
    base_draws = np.sum([r["raw"]["raw_annual_suitable_supply_m3"] for r in base_results], axis=0)
    base_var = float(np.var(base_draws))

    rows = []
    for group_key in UNCERTAINTY_GROUPS:
        frozen_draws = freeze_group_and_rerun(cfrs, group_key)
        frozen_var = float(np.var(frozen_draws))
        marginal_reduction_fraction = max(0.0, (base_var - frozen_var) / base_var) if base_var > 0 else 0.0
        rows.append(
            {
                "uncertainty_group": group_key,
                "baseline_variance": round(base_var, 1),
                "variance_when_this_group_alone_is_resolved": round(frozen_var, 1),
                "marginal_variance_reduction_if_resolved": round(marginal_reduction_fraction, 4),
            }
        )
    rows.sort(key=lambda r: r["marginal_variance_reduction_if_resolved"], reverse=True)
    return {
        "warning": "These are MARGINAL, OVERLAPPING sensitivities, NOT an additive variance partition -- they "
        "answer 'how much would variance shrink if ONLY this one family were resolved', not 'what % of variance "
        "does this family cause'. They can (and typically do) sum to well over 100% because uncertainty families "
        "interact/substitute for each other. For an allocation that IS built to sum to ~100%, see "
        "zurkt-shapley-decomposition-<tag>.json.",
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "method": "Grouped-collapse SENSITIVITY test (Track v3-18/v4-1, renamed for accuracy): each uncertainty "
        "group's Priors are collapsed to their own mean, ONE GROUP AT A TIME, and the resulting drop in aggregate "
        "annual-supply variance is reported as marginal_variance_reduction_if_resolved. This is useful for 'which "
        "single family, if I could resolve only one, would help most' -- it is NOT an additive attribution of "
        "total variance to causes; use it for decision sensitivity, not headline '% of variance' claims.",
        "baseline_variance": round(base_var, 1),
        "groups": rows,
    }


def build_shapley_decomposition(cfrs: list[dict[str, Any]], base_results: list[dict[str, Any]], n_permutations: int = 6, seed: int = 777) -> dict[str, Any]:
    """Track v4-1: a headline attribution that DOES sum to ~100% of the
    resolvable variance, using the standard permutation-sampling estimator
    for Shapley values applied to the cooperative 'variance game'
    v(S) = baseline_variance - variance_with_S_frozen. For each of
    n_permutations random orderings of the 7 uncertainty groups, walk the
    ordering and credit each group with the MARGINAL variance reduction of
    adding it to whatever's already frozen; average each group's marginal
    contribution across permutations. Coalition values are cached (keyed by
    the frozenset of groups) since the same coalition can recur across
    permutations, and v(empty set)=0 and v(full set) are shared constants.
    This is an approximation (n_permutations is small relative to 7!=5040
    orderings, for compute-cost reasons), not an exact Shapley value -- but
    unlike the grouped-collapse test above, IT DOES sum to v(full set) by
    construction (Shapley efficiency property), giving a defensible
    additive headline even though each individual estimate has sampling
    noise from the small permutation count."""
    base_draws = np.sum([r["raw"]["raw_annual_suitable_supply_m3"] for r in base_results], axis=0)
    base_var = float(np.var(base_draws))
    group_keys = list(UNCERTAINTY_GROUPS.keys())

    cache: dict[frozenset, float] = {frozenset(): 0.0}

    def v(coalition: frozenset) -> float:
        if coalition in cache:
            return cache[coalition]
        frozen_draws = freeze_groups_and_rerun(cfrs, list(coalition))
        value = base_var - float(np.var(frozen_draws))
        cache[coalition] = value
        return value

    rng = np.random.default_rng(seed)
    shapley = {k: 0.0 for k in group_keys}
    for _ in range(n_permutations):
        order = list(rng.permutation(len(group_keys)))
        perm = [group_keys[i] for i in order]
        coalition = frozenset()
        prev_value = 0.0
        for g in perm:
            coalition = coalition | {g}
            value = v(coalition)
            shapley[g] += value - prev_value
            prev_value = value
    for k in shapley:
        shapley[k] /= n_permutations

    full_value = v(frozenset(group_keys))
    rows = [
        {
            "uncertainty_group": g,
            "shapley_variance_reduction": round(shapley[g], 1),
            "shapley_share_of_resolvable_variance": round(shapley[g] / full_value, 4) if full_value else None,
        }
        for g in group_keys
    ]
    rows.sort(key=lambda r: r["shapley_variance_reduction"], reverse=True)
    shares_sum = sum(r["shapley_share_of_resolvable_variance"] or 0 for r in rows)

    return {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "method": f"Permutation-sampling Shapley approximation ({n_permutations} random orderings of "
        f"{len(group_keys)} uncertainty groups) over the variance game v(S) = baseline_variance - "
        "variance_with_S_frozen. By construction (the Shapley efficiency property), these shares sum to "
        "~100% of the variance resolved by freezing ALL groups simultaneously -- unlike the grouped-collapse "
        "sensitivity test, this IS an additive attribution, though with sampling noise from the small number of "
        "permutations used (compute-bounded, not exact).",
        "baseline_variance": round(base_var, 1),
        "full_coalition_variance_reduction": round(full_value, 1),
        "shares_sum_check": round(shares_sum, 4),
        "n_permutations": n_permutations,
        "groups": rows,
    }


def build_three_tier_supply_summary(
    technical_potential: dict[str, Any], curve: dict[str, Any], access_state: dict[str, Any] | None, results: list[dict[str, Any]] | None = None
) -> dict[str, Any]:
    """Track v3-6 / v4-2 FIX: keeps three DIFFERENT supply concepts
    explicit and separate --

    A. PHYSICAL/BIOPHYSICAL POTENTIAL   -- technical_potential_m3 (pre-
       access-screen standing/harvestable volume; build_technical_potential()).
    B. SCENARIO-ADDRESSABLE SUPPLY       -- the curve's aggregate_annual_
       suitable_supply_m3, i.e. physical supply after a SCENARIO (ASSUMED,
       not evidence-based) commercial-availability fraction and processor-
       fit screen.
    C. EVIDENCE-CONFIRMED ADDRESSABLE SUPPLY -- physical supply summed ONLY
       over CFRs with a real KNOWN_POTENTIALLY_AVAILABLE access-state
       record. FIX (explicitly required): when this is 0 or small because
       most CFRs are UNKNOWN, the correct status is 'UNRESOLVED' / access
       evidence is INSUFFICIENT -- NEVER 'confirmed unavailable' or
       'confirmed zero supply'. A CFR being UNKNOWN means we have not yet
       established its access status, not that it is inaccessible. This
       function now reports an explicit `status` enum alongside the number
       so no caller can render a bare, misleading '0'."""
    b_p50 = curve["aggregate_annual_suitable_supply_m3"]["p50"]

    if access_state is None:
        return {
            "scenario_version": SCENARIO_VERSION,
            "model_version": MODEL_VERSION,
            "a_physical_biophysical_potential_m3": technical_potential["technical_potential_m3"],
            "b_scenario_addressable_supply_m3": curve["aggregate_annual_suitable_supply_m3"],
            "c_status": "NOT_COMPUTED",
            "c_evidence_confirmed_addressable_supply_m3": None,
            "c_note": "No access_state input was provided to this run.",
            "warning": f"B (scenario-addressable, P50={b_p50}) must NEVER be presented as if it were C (evidence-confirmed) -- they answer different questions.",
        }

    counts = access_state["counts"]
    known_available_ids = {
        c["entity_id"] for c in access_state["cfrs"] if c["access_state"] == "KNOWN_POTENTIALLY_AVAILABLE"
    }
    unknown_count = counts.get("UNKNOWN", 0)
    total = sum(counts.values())

    if known_available_ids and results is not None:
        confirmed_draws = np.sum(
            [r["raw"]["raw_annual_suitable_supply_m3"] for r in results if r["state"].entity_id in known_available_ids],
            axis=0,
        )
        c_value = quantiles(confirmed_draws)
        c_status = "PARTIALLY_CONFIRMED" if unknown_count > 0 else "FULLY_CONFIRMED"
    else:
        c_value = None
        c_status = "UNRESOLVED"

    return {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "a_physical_biophysical_potential_m3": technical_potential["technical_potential_m3"],
        "b_scenario_addressable_supply_m3": curve["aggregate_annual_suitable_supply_m3"],
        "c_status": c_status,
        "c_evidence_confirmed_addressable_supply_m3": c_value,
        "c_access_state_counts": counts,
        "c_note": (
            f"{c_status}: {len(known_available_ids)} of {total} catchment CFRs have real, evidence-confirmed "
            f"KNOWN_POTENTIALLY_AVAILABLE access status. {unknown_count} of {total} remain UNKNOWN -- meaning "
            "access status is UNRESOLVED for them, NOT that they are confirmed unavailable or that their supply "
            "is zero. This number is a CONFIRMED LOWER BOUND on evidence-backed supply, not an estimate of total "
            "accessible supply -- more CFRs likely have real access, it simply has not been established yet."
        ),
        "warning": f"B (scenario-addressable, P50={b_p50}) must NEVER be presented as if it were C (evidence-confirmed) -- they answer different questions. "
        "C must NEVER be rendered as a bare '0' implying evidence of no supply -- always show c_status alongside it.",
    }


def to_cfr_result_row(row: dict[str, Any]) -> dict[str, Any]:
    s = row["state"]
    return {
        "entity_id": s.entity_id,
        "canonical_name": s.canonical_name,
        "evidence": {
            "lat": row["cfr"]["lat"],
            "lon": row["cfr"]["lon"],
            "aoi_id": row["cfr"]["aoi_id"],
            "aoi_version_id": row["cfr"]["aoi_version_id"],
            "gross_mapped_area_ha": s.gross_area_ha,
            "straight_line_km": s.distance_km,
            "road_km": s.road_km,
            "route_source": s.route_source,
            "eo_evidence_status": s.eo_evidence_status,
        },
        "modelled": {
            "biophysical_technical_potential_m3": s.harvestable_volume_m3,
            "commercially_addressable_volume_m3": s.zurkt_suitable_volume_m3,
            "relevant_stocked_area_ha": s.relevant_stocked_area_ha,
            "standing_volume_m3": s.standing_volume_m3,
            "harvestable_volume_m3": s.harvestable_volume_m3,
            "zurkt_suitable_volume_m3": s.zurkt_suitable_volume_m3,
            "grade_g1_share": s.grade_share_g1,
            "grade_g2_share": s.grade_share_g2,
            "grade_g3_share": s.grade_share_g3,
            "procurement_cost_usd_per_m3": s.procurement_cost_usd_per_m3,
            "harvest_extract_load_cost_usd_per_m3": s.harvest_extract_load_cost_usd_per_m3,
            "haulage_cost_usd_per_m3": s.haulage_cost_usd_per_m3,
            "regulatory_admin_cost_usd_per_m3": s.regulatory_admin_cost_usd_per_m3,
            "delivered_cost_usd_per_m3": s.delivered_cost_usd_per_m3,
            "annual_suitable_supply_m3": s.annual_suitable_supply_m3,
            "material_class_probabilities": s.material_class_probabilities,
            "material_class_evidence": s.material_class_evidence,
        },
        "model_version": MODEL_VERSION,
        "processor_spec": s.processor_spec_key,
        "n_draws": s.n_draws,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument(
        "--scenario-tag",
        default="v3",
        help="Suffix for output filenames (e.g. 'v2' -> zurkt-delivered-supply-curve-v2.json). "
        "Never reuse a tag whose files you want to preserve -- v1 outputs must not be overwritten.",
    )
    parser.add_argument(
        "--eo-conditioned-priors",
        type=Path,
        default=None,
        help="Optional zurkt_eo_conditioned_priors.py output JSON -- applies real per-CFR NDVI-based nudges "
        "(Track v3-10). Omit to run without EO conditioning (every multiplier defaults to 1.0).",
    )
    parser.add_argument(
        "--material-class-evidence",
        type=Path,
        default=None,
        help="Optional JSON of real, documented per-CFR material-class mixture probabilities (Track v4-5), "
        "keyed by entity_id -- overrides zurkt_scenario.DEFAULT_MATERIAL_MIX_PROBS for CFRs with evidence. "
        "Omit to use the broad default prior for every CFR.",
    )
    parser.add_argument(
        "--shapley-permutations",
        type=int,
        default=6,
        help="Number of random permutations for the Shapley-approximation decomposition (Track v4-1). Each "
        "permutation costs up to 7 full model reruns (fewer with coalition caching) -- keep small.",
    )
    parser.add_argument(
        "--access-state",
        type=Path,
        default=None,
        help="Optional zurkt_access_state.py output JSON -- used only to build the evidence-supported "
        "three-tier supply summary (Track v3-6); does not change the Monte Carlo itself.",
    )
    args = parser.parse_args()
    tag = args.scenario_tag
    set_default_eo_conditioned_priors_path(args.eo_conditioned_priors)
    set_default_material_class_evidence_path(args.material_class_evidence)

    data = load_catchment(args.input)
    cfrs = data["cfrs"]
    print(f"Loaded {len(cfrs)} catchment CFRs from {args.input}")

    print("Running CFR-level Monte Carlo (STANDARD processor spec)...")
    results = run_all_cfrs(cfrs, "STANDARD")

    print("Validating physical invariants...")
    violations = validate_invariants(results)
    if violations:
        print(f"INVARIANT VIOLATIONS ({len(violations)}):")
        for v in violations[:20]:
            print(f"  - {v}")
        raise SystemExit("Aborting: physical invariants violated -- see above.")
    print("  all invariants satisfied.")

    args.out_dir.mkdir(parents=True, exist_ok=True)

    processor_doc = dict(data["processor"])
    scenario_doc = {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "processor": {
            "display_name": processor_doc.get("display_name", "unknown"),
            "epistemic_class": processor_doc.get("epistemic_class", "UNKNOWN"),
            "location": processor_doc,
            "specification_scenarios": list(PROCESSOR_SPECIFICATION_SCENARIOS.keys()),
        },
        "priors": {
            key: {"kind": p.kind, "params": p.params, "rationale": p.rationale, "evidence_class": p.evidence_class}
            for key, p in PRIORS.items()
        },
        "hierarchical_uncertainty_model": {
            "tiers": {
                "systemic_global": {
                    "description": "One shared draw per Monte Carlo world, applied IDENTICALLY to every CFR -- does not shrink as CFR count grows.",
                    "priors": {
                        "commercial_availability_fraction": "shared national access regime (PRIORS dict)",
                        "stumpage_price_usd_per_m3": "shared national procurement-price regime (PRIORS dict)",
                        "fuel_price_lambda": {"kind": GLOBAL_FUEL_PRICE_LAMBDA_PRIOR.kind, "params": GLOBAL_FUEL_PRICE_LAMBDA_PRIOR.params, "rationale": GLOBAL_FUEL_PRICE_LAMBDA_PRIOR.rationale},
                        "avg_truck_speed_kmph": "shared road-quality/fleet-speed regime (see AVG_TRUCK_SPEED_KMPH_PRIOR)",
                        "stocking_model_bias": {"kind": GLOBAL_STOCKING_MODEL_BIAS_PRIOR.kind, "params": GLOBAL_STOCKING_MODEL_BIAS_PRIOR.params, "rationale": GLOBAL_STOCKING_MODEL_BIAS_PRIOR.rationale},
                        "grade_recovery_dbh_bias_cm": {"kind": GLOBAL_GRADE_RECOVERY_DBH_BIAS_PRIOR.kind, "params": GLOBAL_GRADE_RECOVERY_DBH_BIAS_PRIOR.params, "rationale": GLOBAL_GRADE_RECOVERY_DBH_BIAS_PRIOR.rationale},
                    },
                },
                "regional_cluster": {
                    "description": "One shared draw per (0.5-degree grid cell, world), applied to every CFR in that ~55km cell -- a placeholder for a real ecological/administrative region layer.",
                    "priors": {
                        "stocked_fraction_multiplier": {"kind": REGIONAL_STOCKED_MULTIPLIER_PRIOR.kind, "params": REGIONAL_STOCKED_MULTIPLIER_PRIOR.params, "rationale": REGIONAL_STOCKED_MULTIPLIER_PRIOR.rationale},
                        "maturity_multiplier": {"kind": REGIONAL_MATURITY_MULTIPLIER_PRIOR.kind, "params": REGIONAL_MATURITY_MULTIPLIER_PRIOR.params, "rationale": REGIONAL_MATURITY_MULTIPLIER_PRIOR.rationale},
                    },
                },
                "cfr_specific": {
                    "description": "Independent per-CFR draws -- the ONLY tier in v1/v2. Genuinely averages out across 276 CFRs, unlike the two tiers above.",
                    "priors": ["relevant_forest_fraction", "stocked_fraction", "mature_harvestable_fraction", "stems_per_ha", "mean_tree_dbh_cm", "mean_tree_height_m", "wood_density_t_per_m3", "within_stand_dbh_cv"],
                },
                "measurement": {
                    "description": "CFR-specific but WIDER for CFRs with no EO observations processed yet -- a coarse proxy for 'we know less about this CFR', not a real EO-conditioned posterior.",
                    "widen_factor": MEASUREMENT_WIDEN_FACTOR,
                    "applies_to": ["relevant_forest_fraction", "stocked_fraction"],
                },
            },
            "dependence_structure": "Multiplicative shared shocks (global/regional draws multiply or additively bias each CFR's own CFR-specific draw) rather than a full joint covariance/Gaussian-process model -- a documented first cut per the sprint's own guidance to avoid over-building this for v3.",
        },
        "annual_harvest_fraction_prior": {
            "kind": PRIORS_ANNUAL_HARVEST_FRACTION.kind,
            "params": PRIORS_ANNUAL_HARVEST_FRACTION.params,
            "rationale": PRIORS_ANNUAL_HARVEST_FRACTION.rationale,
        },
        "known_simplifications": [
            "All catchment supply is priced/graded as eucalyptus-equivalent; real species composition of these "
            "natural/mixed gazetted CFRs is unverified.",
            "Stand-level Monte Carlo samples one mean DBH/height/stocking per draw per CFR rather than a full "
            "tree-level population per draw (grade shares are then derived analytically from a within-stand DBH "
            "spread prior, not from a second level of per-tree sampling).",
            "10-year outlook uses a single aggregate net-stock-change fraction, not a real age-structured growth model.",
            "Verification priority uses a transparent proxy, not a formal EVSI/EVPI calculation.",
            "v2 fix: haulage cost now includes an explicit round-trip driving-time term "
            "(2 x haul_km / assumed truck speed), so operator/rental time -- not just fuel -- scales with "
            "distance; this replaced a v1 model where haulage was dominated by a fixed per-trip time regardless "
            "of distance. Average truck speed is still an ASSUMED broad prior (AVG_TRUCK_SPEED_KMPH_PRIOR in "
            "zurkt_scenario.py), not a surveyed route speed, so the curve's overall slope is more realistic but "
            "its exact shape is not calibrated against a real haulage contract.",
            "Standing-timber/procurement cost is a separate ASSUMED line item (stumpage_price_usd_per_m3 prior) "
            "with no real Uganda CFR stumpage price observation behind it -- kept broad and distinct from "
            "harvest/extraction/haulage/regulatory cost, never blended into one number.",
            "v3: uncertainty is now hierarchical (systemic/regional/CFR-specific/measurement tiers -- see "
            "hierarchical_uncertainty_model above), which is why v3's P10-P90 spread is much wider than v2's "
            "despite a similar P50 -- v2's independent-per-CFR-only structure understated real aggregate "
            "uncertainty by letting 276 CFRs' noise average out more than our actual knowledge justifies.",
            "Region assignment (assign_region()) is a 0.5-degree lat/lon grid, not a real ecological, rainfall, "
            "forest-type or administrative-management zone -- a placeholder cluster structure, not evidence.",
            "The access/legal-status search of this repo's ingested data found NO per-CFR license/concession/"
            "management-plan/protection-tier records anywhere -- all 276 CFRs carry the SAME generic 'gazetted "
            "Central Forest Reserve' designation with no further differentiation, so the commercial_availability_"
            "fraction regime is applied uniformly (KNOWN_POTENTIALLY_AVAILABLE: 0, KNOWN_RESTRICTED: 0, UNKNOWN: "
            "276 -- see zurkt-access-state-v3.json). Evidence-supported commercially-addressable supply is "
            "therefore 0 m3/yr until real access records are ingested; this is reported explicitly, not hidden.",
            "Material/species mixture is NOT yet implemented (still a blanket eucalyptus-equivalent assumption "
            "for grading/pricing) -- Evergreen's real export records (eucalyptus veneer) make this a credible "
            "RELEVANT material class for this specific processor, but do not establish that all 276 CFRs' supply "
            "is eucalyptus, nor that current grade thresholds are Evergreen's real buying spec.",
            "EO-conditioning of CFR priors is NOT yet implemented beyond the binary observed/not-yet-processed "
            "MEASUREMENT-tier widening above, despite real per-CFR NDVI/NDMI/NBR time series existing in "
            "observations.eo_feature_value for all 276 catchment CFRs -- a genuine, scoped-out opportunity for a "
            "follow-up pass (see final report).",
            "Landsat long-history analysis does NOT exist for Mabira, South Busoga or Buyaga Dam (checked "
            "directly) -- the only Landsat long-history output in this repository covers three unrelated CFRs "
            "(Epor, Zulia, Musamya) as a standalone file, never written to the canonical database.",
        ],
        "catchment_size": len(cfrs),
        "economic_screen_threshold_usd_per_m3": ECONOMIC_SCREEN_MAX_DELIVERED_COST_USD_PER_M3,
    }
    (args.out_dir / f"zurkt-uganda-scenario-{tag}.json").write_text(json.dumps(scenario_doc, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-uganda-scenario-{tag}.json")

    cfr_results_doc = {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "cfrs": [to_cfr_result_row(r) for r in results],
    }
    (args.out_dir / f"zurkt-cfr-supply-results-{tag}.json").write_text(json.dumps(cfr_results_doc, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-cfr-supply-results-{tag}.json ({len(results)} CFRs)")

    print("Building delivered-cost supply curve...")
    curve = build_supply_curve(results)
    (args.out_dir / f"zurkt-delivered-supply-curve-{tag}.json").write_text(json.dumps(curve, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-delivered-supply-curve-{tag}.json (P50 aggregate {curve['aggregate_annual_suitable_supply_m3']})")

    print("Building 10-year outlook (depletion stress test)...")
    outlook = build_outlook(results)
    (args.out_dir / f"zurkt-10yr-outlook-{tag}.json").write_text(json.dumps(outlook, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-10yr-outlook-{tag}.json (year 1 {outlook['years'][0]['annual_supply_m3']}, year 10 {outlook['years'][9]['annual_supply_m3']})")

    print("Building age-structured cohort outlook (Track v4-9, separate comparison)...")
    age_outlook = build_age_structured_outlook(results)
    (args.out_dir / f"zurkt-age-structured-outlook-{tag}.json").write_text(json.dumps(age_outlook, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-age-structured-outlook-{tag}.json (year 1 {age_outlook['years'][0]['annual_supply_m3']}, year 10 {age_outlook['years'][9]['annual_supply_m3']})")

    print("Building technical-potential aggregate (joint draws, v3 fix)...")
    technical_potential = build_technical_potential(results)
    (args.out_dir / f"zurkt-technical-potential-{tag}.json").write_text(json.dumps(technical_potential, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-technical-potential-{tag}.json ({technical_potential['technical_potential_m3']})")

    access_state = json.loads(args.access_state.read_text(encoding="utf-8")) if args.access_state else None
    three_tier = build_three_tier_supply_summary(technical_potential, curve, access_state, results)
    (args.out_dir / f"zurkt-three-tier-supply-{tag}.json").write_text(json.dumps(three_tier, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-three-tier-supply-{tag}.json")
    print(f"  A physical potential:   {three_tier['a_physical_biophysical_potential_m3']}")
    print(f"  B scenario-addressable: {three_tier['b_scenario_addressable_supply_m3']}")
    print(f"  C status:               {three_tier['c_status']}")
    print(f"  C evidence-confirmed:   {three_tier['c_evidence_confirmed_addressable_supply_m3']}")

    print("Building draw-wise economic dispatch + demand reliability...")
    dispatch = build_drawwise_dispatch(results)
    (args.out_dir / f"zurkt-demand-reliability-{tag}.json").write_text(json.dumps(dispatch, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-demand-reliability-{tag}.json")
    for row in dispatch["demand_reliability"]:
        print(f"  {row['demand_m3_per_year']:>7,} m3/yr: P(supply>=demand)={row['p_supply_meets_demand']}, "
              f"shortfall P50={row['shortfall_m3']['p50']}, CFRs needed(P50)={row['required_source_cfr_count']['p50']}")

    print("Running sensitivity analysis (6 one-variable cases)...")
    sensitivity = build_sensitivity(cfrs, results)
    (args.out_dir / f"zurkt-sensitivity-{tag}.json").write_text(json.dumps(sensitivity, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-sensitivity-{tag}.json")
    for row in sensitivity["one_variable_sensitivities"]:
        print(f"  {row['perturbation']}: supply {row['supply_change_pct']}%, cost {row['cost_change_pct']}%")

    print("Ranking verification priorities...")
    verification = build_verification_priorities(results)
    (args.out_dir / f"zurkt-verification-priorities-{tag}.json").write_text(json.dumps(verification, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-verification-priorities-{tag}.json")
    for row in verification["top_verification_targets"][:5]:
        print(f"  #{verification['top_verification_targets'].index(row)+1} {row['canonical_name']}: VOI-proxy {row['value_of_information_proxy']}")

    print("Running uncertainty decomposition (7 grouped-collapse sensitivity tests, non-additive)...")
    decomposition = build_uncertainty_decomposition(cfrs, results)
    (args.out_dir / f"zurkt-uncertainty-decomposition-{tag}.json").write_text(json.dumps(decomposition, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-uncertainty-decomposition-{tag}.json")
    for row in decomposition["groups"]:
        print(f"  {row['uncertainty_group']}: marginal reduction if resolved ~{round(row['marginal_variance_reduction_if_resolved']*100,1)}%")

    print(f"Running Shapley-approximation decomposition ({args.shapley_permutations} permutations, additive)...")
    shapley = build_shapley_decomposition(cfrs, results, n_permutations=args.shapley_permutations)
    (args.out_dir / f"zurkt-shapley-decomposition-{tag}.json").write_text(json.dumps(shapley, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-shapley-decomposition-{tag}.json (shares sum to {shapley['shares_sum_check']})")
    for row in shapley["groups"]:
        pct = round((row["shapley_share_of_resolvable_variance"] or 0) * 100, 1)
        print(f"  {row['uncertainty_group']}: {pct}% (Shapley, additive)")

    print("Running EVSI re-simulation (top CFRs x 4 candidate variables)...")
    evsi = build_evsi(cfrs, results, dispatch, top_n_cfrs=5)
    (args.out_dir / f"zurkt-evsi-{tag}.json").write_text(json.dumps(evsi, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-evsi-{tag}.json")
    for row in evsi["ranked_cfr_variable_pairs"][:5]:
        print(f"  {row['canonical_name']} / {row['variable']}: shortfall reduction {row['expected_shortfall_reduction_m3']:,.0f} m3")

    field_programme = build_field_programme(evsi)
    (args.out_dir / f"zurkt-field-programme-{tag}.json").write_text(json.dumps(field_programme, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-field-programme-{tag}.json")

    print("\nDone.")


if __name__ == "__main__":
    main()
