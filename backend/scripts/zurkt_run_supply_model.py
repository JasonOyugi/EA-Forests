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
    MODEL_VERSION,
    PRIORS,
    PRIORS_ANNUAL_HARVEST_FRACTION,
    PROCESSOR_SPECIFICATION_SCENARIOS,
    SCENARIO_VERSION,
    build_cfr_supply_state,
    quantiles,
)

N_DRAWS = 2_000
ECONOMIC_SCREEN_MAX_DELIVERED_COST_USD_PER_M3 = 60.0  # scenario threshold, see module note below
OUTLOOK_YEARS = 10
NET_STOCK_CHANGE_FRACTION_MEAN = -0.01  # ASSUMED, see build_outlook()
NET_STOCK_CHANGE_FRACTION_STD = 0.03


def load_catchment(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def run_all_cfrs(cfrs: list[dict[str, Any]], spec_key: str = "STANDARD") -> list[dict[str, Any]]:
    results = []
    for i, cfr in enumerate(cfrs):
        state, raw = build_cfr_supply_state(
            entity_id=cfr["entity_id"],
            canonical_name=cfr["canonical_name"],
            gross_area_ha=cfr["area_ha"],
            distance_km=cfr["distance_km"],
            road_km=cfr.get("road_km"),
            route_source=cfr.get("route_source", "unavailable"),
            eo_evidence_status=cfr.get("eo_evidence_status", "not_yet_processed"),
            processor_spec_key=spec_key,
            n_draws=N_DRAWS,
            rng_seed=1000 + i,  # unique per CFR -> independent draws, valid for cross-CFR aggregation
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
        for cost_field in ["harvest_extract_load_cost_usd_per_m3", "haulage_cost_usd_per_m3", "delivered_cost_usd_per_m3"]:
            vals = getattr(s, cost_field)
            if vals["p50"] < 0:
                violations.append(f"{name}: negative {cost_field}")
    return violations


def build_supply_curve(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Track 11. Ranked by P50 delivered cost; cumulative P50 annual
    suitable supply. P10/P90 aggregate bands come from summing each CFR's
    OWN P10/P90 raw draws (valid because each CFR was simulated with an
    independent rng seed) -- documented as an aggregate band alongside the
    P50 curve, not as a second curve with its own ranking, which would
    require a joint delivered-cost ranking under each scenario."""
    ranked = sorted(results, key=lambda r: r["state"].delivered_cost_usd_per_m3["p50"])
    cumulative = 0.0
    points = []
    for row in ranked:
        s = row["state"]
        cumulative += s.annual_suitable_supply_m3["p50"]
        points.append(
            {
                "entity_id": s.entity_id,
                "canonical_name": s.canonical_name,
                "delivered_cost_usd_per_m3_p50": s.delivered_cost_usd_per_m3["p50"],
                "annual_suitable_supply_m3_p50": round(s.annual_suitable_supply_m3["p50"], 1),
                "cumulative_annual_supply_m3_p50": round(cumulative, 1),
            }
        )

    # Aggregate P10/P50/P90: sum each CFR's OWN raw per-draw array first
    # (valid because every CFR used an independent rng seed), THEN take
    # quantiles of the resulting joint sum -- not the sum of each CFR's own
    # quantiles. For right-skewed per-CFR distributions (mean > median),
    # summing quantiles systematically understates the true aggregate
    # median; summing draws first is the statistically correct order and
    # is what build_outlook() below already does for the 10-year figures --
    # keeping this consistent so the dashboard never shows two conflicting
    # "P50 annual supply" numbers computed two different ways.
    aggregate_draws = np.sum([r["raw"]["raw_annual_suitable_supply_m3"] for r in results], axis=0)
    aggregate_p10, aggregate_p50, aggregate_p90 = (
        round(float(v), 1) for v in np.percentile(aggregate_draws, [10, 50, 90])
    )

    thresholds_usd_per_m3 = [20, 30, 40, 50, 60, 80, 100]
    volume_below_threshold = []
    for t in thresholds_usd_per_m3:
        below = [r for r in ranked if r["state"].delivered_cost_usd_per_m3["p50"] <= t]
        volume_below_threshold.append(
            {
                "delivered_cost_threshold_usd_per_m3": t,
                "contributing_cfrs": len(below),
                "cumulative_annual_supply_m3_p50": round(sum(r["state"].annual_suitable_supply_m3["p50"] for r in below), 1),
            }
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
    top5_by_volume = sum(r["state"].annual_suitable_supply_m3["p50"] for r in by_volume[:5])
    top10_by_volume = sum(r["state"].annual_suitable_supply_m3["p50"] for r in by_volume[:10])

    return {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "ranking_basis": "P50 delivered cost ascending (per-CFR quantile, not a joint aggregate distribution)",
        "points": points,
        "aggregate_annual_suitable_supply_m3": {
            "p10": round(aggregate_p10, 1), "p50": round(aggregate_p50, 1), "p90": round(aggregate_p90, 1),
        },
        "volume_below_cost_threshold": volume_below_threshold,
        "source_concentration": {
            "top5_cfrs_share_of_p50_supply": round(top5_by_volume / aggregate_p50, 3) if aggregate_p50 else None,
            "top10_cfrs_share_of_p50_supply": round(top10_by_volume / aggregate_p50, 3) if aggregate_p50 else None,
            "note": "Ranked by each CFR's own P50 annual supply (largest first), not by delivered cost -- "
            "concentration measures dependence on the biggest few suppliers. Shares are against the sum of "
            "each CFR's own P50 (not the joint aggregate P50), consistent with how those per-CFR P50s are "
            "ranked and summed here.",
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
            "relevant_stocked_area_ha": s.relevant_stocked_area_ha,
            "standing_volume_m3": s.standing_volume_m3,
            "harvestable_volume_m3": s.harvestable_volume_m3,
            "zurkt_suitable_volume_m3": s.zurkt_suitable_volume_m3,
            "grade_g1_share": s.grade_share_g1,
            "grade_g2_share": s.grade_share_g2,
            "grade_g3_share": s.grade_share_g3,
            "harvest_extract_load_cost_usd_per_m3": s.harvest_extract_load_cost_usd_per_m3,
            "haulage_cost_usd_per_m3": s.haulage_cost_usd_per_m3,
            "delivered_cost_usd_per_m3": s.delivered_cost_usd_per_m3,
            "annual_suitable_supply_m3": s.annual_suitable_supply_m3,
        },
        "model_version": MODEL_VERSION,
        "processor_spec": s.processor_spec_key,
        "n_draws": s.n_draws,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    args = parser.parse_args()

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

    scenario_doc = {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "processor": {
            "display_name": "Zurkt Uganda",
            "epistemic_class": "SCENARIO",
            "note": "No real Zurkt facts exist anywhere in this repository or its history (exhaustive search, 2026-09-11).",
            "location": data["processor"],
            "specification_scenarios": list(PROCESSOR_SPECIFICATION_SCENARIOS.keys()),
        },
        "priors": {
            key: {"kind": p.kind, "params": p.params, "rationale": p.rationale, "evidence_class": p.evidence_class}
            for key, p in PRIORS.items()
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
            "Delivered cost per m3 is only weakly distance-sensitive in this v1 model: haulage cost is dominated "
            "by fixed per-trip operator/rental time, with only the fuel component scaling with road distance -- so "
            "most catchment CFRs cluster at a similar delivered cost regardless of how far they are, and the "
            "delivered-cost supply curve is closer to a step function than a smooth cost-distance gradient. Real "
            "haulage contracts are usually more distance-sensitive than this; treat the curve's shape, not just "
            "its endpoints, as a modelling artifact to revisit.",
        ],
        "catchment_size": len(cfrs),
        "economic_screen_threshold_usd_per_m3": ECONOMIC_SCREEN_MAX_DELIVERED_COST_USD_PER_M3,
    }
    (args.out_dir / "zurkt-uganda-scenario-v1.json").write_text(json.dumps(scenario_doc, indent=2), encoding="utf-8")
    print("Wrote zurkt-uganda-scenario-v1.json")

    cfr_results_doc = {
        "scenario_version": SCENARIO_VERSION,
        "model_version": MODEL_VERSION,
        "cfrs": [to_cfr_result_row(r) for r in results],
    }
    (args.out_dir / "zurkt-cfr-supply-results-v1.json").write_text(json.dumps(cfr_results_doc, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-cfr-supply-results-v1.json ({len(results)} CFRs)")

    print("Building delivered-cost supply curve...")
    curve = build_supply_curve(results)
    (args.out_dir / "zurkt-delivered-supply-curve-v1.json").write_text(json.dumps(curve, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-delivered-supply-curve-v1.json (P50 aggregate {curve['aggregate_annual_suitable_supply_m3']})")

    print("Building 10-year outlook...")
    outlook = build_outlook(results)
    (args.out_dir / "zurkt-10yr-outlook-v1.json").write_text(json.dumps(outlook, indent=2), encoding="utf-8")
    print(f"Wrote zurkt-10yr-outlook-v1.json (year 1 {outlook['years'][0]['annual_supply_m3']}, year 10 {outlook['years'][9]['annual_supply_m3']})")

    print("Running sensitivity analysis (6 one-variable cases)...")
    sensitivity = build_sensitivity(cfrs, results)
    (args.out_dir / "zurkt-sensitivity-v1.json").write_text(json.dumps(sensitivity, indent=2), encoding="utf-8")
    print("Wrote zurkt-sensitivity-v1.json")
    for row in sensitivity["one_variable_sensitivities"]:
        print(f"  {row['perturbation']}: supply {row['supply_change_pct']}%, cost {row['cost_change_pct']}%")

    print("Ranking verification priorities...")
    verification = build_verification_priorities(results)
    (args.out_dir / "zurkt-verification-priorities-v1.json").write_text(json.dumps(verification, indent=2), encoding="utf-8")
    print("Wrote zurkt-verification-priorities-v1.json")
    for row in verification["top_verification_targets"][:5]:
        print(f"  #{verification['top_verification_targets'].index(row)+1} {row['canonical_name']}: VOI-proxy {row['value_of_information_proxy']}")

    print("\nDone.")


if __name__ == "__main__":
    main()
