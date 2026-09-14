"""Forest asset option value (Track v7, items 18-19): stop reporting a
negative current harvest margin as if it were a negative biological asset
value. An owner who is free not to harvest can WAIT; the asset's value is
the value of the OPTIMAL policy over WAIT/HARVEST, not today's harvest
payoff alone.

FIRST IMPLEMENTATION, EXPLICITLY LABELLED AS SUCH (per the sprint's own
instruction that a first pass may be a "clearly-labelled finite-horizon
approximation" rather than a full continuous-state solver): a discrete
2026-2028 horizon, backward-induced via cross-sectional averaging (the
continuation value at each step is the discounted MEAN of next period's
value function across simulated paths, not a state-dependent regression --
a real simplification, not a hidden one). Volume and netback paths are
resampled independently per year from the SAME posterior distributions
already produced by tree_population_model.py and the processor netback
calculation, which is itself a disclosed simplifying assumption (it ignores
any year-to-year persistence/correlation in price or growth shocks beyond
what the underlying draws already encode).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

import numpy as np


def _deterministic_seed(key: str, base_seed: int = 0) -> int:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return (base_seed + int(digest[:8], 16)) % (2**31 - 1)


@dataclass
class OptionValueResult:
    years: list[int]
    harvest_margin_by_year_usd: dict[int, dict[str, float]]  # may be negative
    immediate_harvest_option_value_by_year_usd: dict[int, dict[str, float]]  # max(0, margin)
    asset_option_value_usd: dict[str, float]  # value of the optimal WAIT/HARVEST policy, first-year terms
    optimal_action_by_year: dict[int, str]  # "HARVEST" or "WAIT", evaluated at the cross-sectional mean
    discount_rate: float
    method_note: str


def _quantiles(x: np.ndarray) -> dict[str, float]:
    return {"p10": float(np.percentile(x, 10)), "p50": float(np.percentile(x, 50)), "p90": float(np.percentile(x, 90))}


def compute_option_value(
    volume_draws_by_year: dict[int, np.ndarray],
    netback_usd_per_m3_draws_by_year: dict[int, np.ndarray],
    seed_key: str,
    discount_rate: float = 0.08,
    n_paths: int = 4000,
) -> OptionValueResult:
    years = sorted(volume_draws_by_year.keys())
    rng = np.random.default_rng(_deterministic_seed(seed_key, 31_000))

    harvest_payoff: dict[int, np.ndarray] = {}
    harvest_margin: dict[int, np.ndarray] = {}
    for y in years:
        vol = rng.choice(volume_draws_by_year[y], size=n_paths, replace=True)
        nb = rng.choice(netback_usd_per_m3_draws_by_year[y], size=n_paths, replace=True)
        margin = vol * nb
        harvest_margin[y] = margin
        harvest_payoff[y] = np.maximum(0.0, margin)

    # Backward induction: terminal year must liquidate at its (possibly
    # zero-floored) payoff; earlier years choose max(harvest now, discounted
    # expected continuation value).
    value_fn: dict[int, np.ndarray] = {years[-1]: harvest_payoff[years[-1]]}
    optimal_action: dict[int, str] = {years[-1]: "HARVEST" if float(np.mean(harvest_payoff[years[-1]])) > 0 else "WAIT"}
    for y in reversed(years[:-1]):
        next_year = years[years.index(y) + 1]
        continuation_value = float(np.mean(value_fn[next_year])) / (1.0 + discount_rate)
        value_fn[y] = np.maximum(harvest_payoff[y], continuation_value)
        # Strict ">" (not ">="), matching the terminal year's tie-break
        # convention below: when harvest and continuation are exactly equal
        # (e.g. both genuinely zero -- netback is negative every draw, so
        # harvest_payoff is deterministically 0 for every path), label the
        # action WAIT, not HARVEST, so the label never overstates a $0
        # option value as if there were a real incentive to harvest now.
        optimal_action[y] = "HARVEST" if float(np.mean(harvest_payoff[y])) > continuation_value else "WAIT"

    first_year = years[0]
    return OptionValueResult(
        years=years,
        harvest_margin_by_year_usd={y: _quantiles(harvest_margin[y]) for y in years},
        immediate_harvest_option_value_by_year_usd={y: _quantiles(harvest_payoff[y]) for y in years},
        asset_option_value_usd=_quantiles(value_fn[first_year]),
        optimal_action_by_year=optimal_action,
        discount_rate=discount_rate,
        method_note=(
            f"Discrete {years[0]}-{years[-1]} WAIT/HARVEST dynamic program, backward-induced via "
            f"cross-sectional mean continuation value (not a state-dependent regression -- a first "
            f"implementation, not a full continuous-state solver), {discount_rate:.0%} real discount rate "
            f"(ASSUMED, not measured for these assets), {n_paths} resampled paths per year from the "
            "existing volume/netback posteriors (years resampled independently, so any real cross-year "
            "persistence in price or growth shocks beyond what those posteriors already encode is not "
            "captured). asset_option_value_usd is expressed in the first horizon year's terms."
        ),
    )
