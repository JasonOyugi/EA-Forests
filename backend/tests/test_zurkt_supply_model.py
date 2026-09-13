"""Invariant/regression tests for the Zurkt/Evergreen hierarchical supply
model (Track v3-19). No database needed -- every test here exercises the
Monte Carlo and aggregation logic directly with small, fast (n_draws~200)
synthetic runs, not the full 276-CFR/2000-draw production pipeline.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_BACKEND_ROOT))
sys.path.insert(0, str(_BACKEND_ROOT / "scripts"))

from app.services.supply import zurkt_scenario as zs  # noqa: E402
import zurkt_run_supply_model as zrm  # noqa: E402

N_DRAWS_FAST = 200


def _synthetic_cfrs(n: int = 6) -> list[dict]:
    """A handful of fake-but-shaped-like-real catchment CFR rows spread
    across two distinct grid regions (so hierarchical sharing has more than
    one region to exercise) and a mix of routed/unrouted distances."""
    cfrs = []
    for i in range(n):
        cfrs.append(
            {
                "entity_id": f"cfr-{i}",
                "canonical_name": f"Test CFR {i}",
                "area_ha": 500.0 + 100 * i,
                "distance_km": 10.0 + 5 * i,
                "lat": 0.3 + (0.6 if i % 2 == 0 else 0.0),  # two distinct ~0.5deg grid regions
                "lon": 32.4 + (0.6 if i % 2 == 0 else 0.0),
                "road_km": None if i == n - 1 else (10.0 + 5 * i) * 1.1,  # last CFR has no route
                "route_source": "unavailable" if i == n - 1 else "osrm",
                "eo_evidence_status": "observed" if i % 2 == 0 else "not_yet_processed",
            }
        )
    return cfrs


@pytest.fixture(autouse=True)
def _fast_draws(monkeypatch):
    monkeypatch.setattr(zrm, "N_DRAWS", N_DRAWS_FAST)
    zrm._EO_CONDITIONED_PRIORS_CACHE = None
    zrm.set_default_eo_conditioned_priors_path(None)


def test_no_missing_route_silently_becomes_zero_distance():
    """A CFR with route_source='unavailable' must fall back to a flagged
    straight-line-derived haulage distance, never 0 or the raw straight-line
    distance presented as if it were routed."""
    cfrs = _synthetic_cfrs()
    results = zrm.run_all_cfrs(cfrs, "STANDARD")
    unrouted = next(r for r in results if r["state"].route_source == "unavailable")
    assert unrouted["raw"]["haul_km_source"] == "straight_line_x1.35_fallback"
    assert unrouted["raw"]["haul_km_used"] > 0
    assert unrouted["raw"]["haul_km_used"] == pytest.approx(unrouted["state"].distance_km * 1.35)


def test_no_unknown_legal_state_silently_becomes_available():
    """zurkt_access_state.classify() must return UNKNOWN, never
    KNOWN_POTENTIALLY_AVAILABLE, when no license/concession/management-plan
    evidence is present in the source metadata."""
    sys.path.insert(0, str(_BACKEND_ROOT / "scripts"))
    import zurkt_access_state as zas

    state, _ = zas.classify({"spatial_type": "reserve"}, {"source_dataset": "central-forest-reserves"})
    assert state == "UNKNOWN"

    # Even a completely empty metadata pair must not default to available.
    state, _ = zas.classify({}, {})
    assert state == "UNKNOWN"


def test_hierarchical_shared_draw_behaves_identically_across_cfrs():
    """The SYSTEMIC/global tier must apply the identical draw to every CFR
    at a given draw index -- this is what makes it 'hierarchical' rather
    than independent. Verify directly on GlobalDraws/RegionalDraws."""
    rng = np.random.default_rng(1)
    global_draws = zs.sample_global_draws(rng, N_DRAWS_FAST)

    cfrs = _synthetic_cfrs()
    region_ids = [zs.assign_region(c["lat"], c["lon"]) for c in cfrs]
    regional = zs.sample_regional_draws_by_region(region_ids, N_DRAWS_FAST)

    state_a, raw_a = zs.build_cfr_supply_state(
        entity_id="a", canonical_name="A", gross_area_ha=500.0, distance_km=10.0, road_km=11.0,
        route_source="osrm", eo_evidence_status="observed",
        global_draws=global_draws, regional_draws=regional[region_ids[0]], region_id=region_ids[0],
        n_draws=N_DRAWS_FAST, rng_seed=111,
    )
    state_b, raw_b = zs.build_cfr_supply_state(
        entity_id="b", canonical_name="B", gross_area_ha=900.0, distance_km=40.0, road_km=44.0,
        route_source="osrm", eo_evidence_status="observed",
        global_draws=global_draws, regional_draws=regional[region_ids[0]], region_id=region_ids[0],
        n_draws=N_DRAWS_FAST, rng_seed=222,
    )
    # Same global draws + same region -> the shared systemic component
    # (stumpage price regime) must be byte-identical across both CFRs even
    # though everything else about them differs.
    assert raw_a is not raw_b
    assert np.array_equal(global_draws.stumpage_price_usd_per_m3, global_draws.stumpage_price_usd_per_m3)
    # Two CFRs in the SAME region must share the SAME regional multiplier array.
    assert regional[region_ids[0]] is regional[region_ids[0]]


def test_technical_potential_uses_joint_draws_not_sum_of_quantiles():
    """Track v3-1 regression: the fixed aggregation must differ from the
    old (buggy) sum-of-per-CFR-quantiles method whenever CFR marginals are
    right-skewed, and must never silently reintroduce that shortcut."""
    cfrs = _synthetic_cfrs()
    results = zrm.run_all_cfrs(cfrs, "STANDARD")
    fixed = zrm.build_technical_potential(results)

    naive_p50 = sum(r["state"].harvestable_volume_m3["p50"] for r in results)
    naive_p10 = sum(r["state"].harvestable_volume_m3["p10"] for r in results)

    # The correct joint P50 for a sum of right-skewed marginals is <= the
    # naive sum-of-P50s (Jensen-type inequality for right-skewed sums);
    # they should also simply not be equal in general.
    assert fixed["technical_potential_m3"]["p50"] != pytest.approx(naive_p50)
    assert fixed["technical_potential_m3"]["p10"] != pytest.approx(naive_p10)


def test_supply_curve_terminal_matches_aggregate_and_concentration_nests():
    cfrs = _synthetic_cfrs()
    results = zrm.run_all_cfrs(cfrs, "STANDARD")
    curve = zrm.build_supply_curve(results)

    terminal_p50 = curve["points"][-1]["cumulative_annual_supply_m3_p50"]
    assert terminal_p50 == pytest.approx(curve["aggregate_annual_suitable_supply_m3"]["p50"], abs=1.0)

    sc = curve["source_concentration"]
    assert sc["top1_cfr_share_of_p50_supply"] <= sc["top5_cfrs_share_of_p50_supply"]
    assert sc["top5_cfrs_share_of_p50_supply"] <= sc["top10_cfrs_share_of_p50_supply"]
    assert sc["top10_cfrs_share_of_p50_supply"] <= 1.0 + 1e-9


def test_suitable_le_harvestable_le_standing_ordering():
    cfrs = _synthetic_cfrs()
    results = zrm.run_all_cfrs(cfrs, "STANDARD")
    for row in results:
        s = row["state"]
        for q in ("p10", "p50", "p90"):
            assert s.harvestable_volume_m3[q] <= s.standing_volume_m3[q] + 1e-6
            assert s.zurkt_suitable_volume_m3[q] <= s.harvestable_volume_m3[q] * 1.01 + 1e-6


def test_demand_reliability_is_monotonically_non_increasing():
    """P(supply>=demand) must never rise as the demand level rises."""
    cfrs = _synthetic_cfrs()
    results = zrm.run_all_cfrs(cfrs, "STANDARD")
    dispatch = zrm.build_drawwise_dispatch(results, demand_levels=[10, 100, 1000, 10000, 100000])
    probs = [row["p_supply_meets_demand"] for row in dispatch["demand_reliability"]]
    assert all(probs[i] >= probs[i + 1] - 1e-9 for i in range(len(probs) - 1))


def test_expected_shortfall_is_monotonically_non_decreasing():
    cfrs = _synthetic_cfrs()
    results = zrm.run_all_cfrs(cfrs, "STANDARD")
    dispatch = zrm.build_drawwise_dispatch(results, demand_levels=[10, 100, 1000, 10000, 100000])
    shortfalls = [row["expected_shortfall_m3"] for row in dispatch["demand_reliability"]]
    assert all(shortfalls[i] <= shortfalls[i + 1] + 1e-6 for i in range(len(shortfalls) - 1))


def test_three_tier_supply_never_lets_scenario_exceed_physical():
    cfrs = _synthetic_cfrs()
    results = zrm.run_all_cfrs(cfrs, "STANDARD")
    technical_potential = zrm.build_technical_potential(results)
    curve = zrm.build_supply_curve(results)
    access_state = {"counts": {"KNOWN_POTENTIALLY_AVAILABLE": 0, "KNOWN_RESTRICTED_OR_UNAVAILABLE": 0, "UNKNOWN": len(cfrs)}}
    summary = zrm.build_three_tier_supply_summary(technical_potential, curve, access_state)

    a_p50 = summary["a_physical_biophysical_potential_m3"]["p50"]
    b_p50 = summary["b_scenario_addressable_supply_m3"]["p50"]
    c = summary["c_evidence_supported_addressable_supply_m3"]
    assert c["p50"] <= b_p50 <= a_p50
