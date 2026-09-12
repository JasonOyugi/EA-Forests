"""Zurkt Uganda supply scenario -- CFR-level stochastic supply state.

SCENARIO_VERSION = "zurkt-uganda-supply-scenario-v1"

This module turns the real 274-CFR catchment (zurkt_supply_catchment.py /
zurkt_road_distance.py) into an uncertainty-aware answer to "how much
roundwood could plausibly reach Zurkt, from where, at what cost" --
without ever presenting an assumption as an observation. Four classes of
quantity are kept explicitly separate throughout (never blurred):

  OBSERVED  -- CFR geometry, area, canonical entity/AOI identity, real EO
              observation counts. Comes straight from the operational
              canonical database (ea_forests_uganda_country_pass).
  DERIVED   -- straight-line and road-network distance/time (computed from
              OBSERVED geometry via haversine/OSRM, not assumed).
  ASSUMED   -- everything about stand composition, stocking, maturity,
              commercial availability, and the Zurkt processor's own
              location/specification. No field inventory exists for any
              of these 274 CFRs, and no real Zurkt processor fact exists
              anywhere in this repository -- these are explicit, broad,
              conservative priors/scenarios, not observations. Every
              ASSUMED quantity below carries a `rationale` string.
  MODELLED  -- standing/harvestable/suitable volume, delivered cost, and
              everything derived from running ASSUMED distributions
              through the existing cost/grade engine
              (app.services.roundwood_production) via Monte Carlo. Always
              carries P10/P50/P90, never a single point estimate.

Reuses, rather than reimplements, backend/app/services/roundwood_production.py:
its wage/price/quantity tables, its STANDARD/LARGE_LOG grade specs (for the
processor-specification scenarios), its tree-volume form factor, and its
haversine/OSRM routing. Only the *stand* side (what roundwood_production.py
always took as caller-supplied scenario input) is new here, because no
caller-supplied stand exists for any of these 274 real forests.

KNOWN SIMPLIFICATION (documented, not hidden): roundwood_production.py's
grade/price library is built for eucalyptus/pine plantation logs. Uganda's
gazetted Central Forest Reserves are natural/mixed estate whose real
species composition is unverified. This model prices all catchment supply
as "eucalyptus-equivalent" for grading/pricing purposes -- a major,
explicitly-flagged simplification, not a species observation. A follow-up
with real species survey data should replace this.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Literal

import numpy as np

from app.services.roundwood_production import (
    LARGE_LOG_EUC_SPEC,
    STANDARD_EUC_SPEC,
    haversine_km,
    retail_labour_categories,
    retail_nonlab_items,
    retail_quantity_library,
)

SCENARIO_VERSION = "zurkt-uganda-supply-scenario-v1"
MODEL_VERSION = "zurkt-cfr-monte-carlo-v1"

# ---------------------------------------------------------------------------
# ASSUMED: the Zurkt processor itself. No real Zurkt fact exists anywhere in
# this repository or its git history (confirmed by exhaustive search,
# 2026-09-11). Location is a scenario placeholder (see
# zurkt_supply_catchment.py's module docstring for why Jinja).
# ---------------------------------------------------------------------------
ZURKT_PROCESSOR_LOCATION = {"lat": 0.4479, "lon": 33.2026}

# A constructed "LOW-GRADE / FLEXIBLE" spec, same shape/pattern as this
# repo's existing STANDARD_EUC_SPEC / LARGE_LOG_EUC_SPEC (grades keyed by
# dbh_min/h_min, per_tonne prices) -- not asserted as any real buyer's
# actual spec, just a third scenario point on the same axis the existing
# specs already vary along.
LOW_GRADE_FLEXIBLE_EUC_SPEC = {
    "grades": {
        "g1": {"dbh_min": 20.0, "h_min": 2.7},
        "g2": {"dbh_min": 15.0, "h_min": 2.7},
        "g3": {"dbh_min": 10.0, "h_min": 2.0},
    },
    "price_mode": "per_tonne",
    "prices": {"g1": 105_000, "g2": 95_000, "g3": 85_000, "reject": 0},
}

PROCESSOR_SPECIFICATION_SCENARIOS: dict[str, dict[str, Any]] = {
    "STANDARD": STANDARD_EUC_SPEC,
    "LARGE_LOG_STRICT": LARGE_LOG_EUC_SPEC,
    "LOW_GRADE_FLEXIBLE": LOW_GRADE_FLEXIBLE_EUC_SPEC,
}

UGX_PER_USD = 3_700.0


@dataclass(frozen=True)
class Prior:
    """One ASSUMED quantity: a distribution plus why it looks like this."""

    kind: Literal["beta", "normal"]
    params: dict[str, float]
    rationale: str
    evidence_class: str = "ASSUMED"

    def sample(self, rng: np.random.Generator, n: int) -> np.ndarray:
        if self.kind == "beta":
            return rng.beta(self.params["a"], self.params["b"], size=n)
        mean, std = self.params["mean"], self.params["std"]
        return np.maximum(rng.normal(mean, std, size=n), self.params.get("min", 1e-6))


# ---------------------------------------------------------------------------
# ASSUMED priors (Track 4/1). Broad and conservative by design -- no field
# inventory exists for any of these 274 CFRs. Every rationale is honest
# about being a placeholder, not a citation.
# ---------------------------------------------------------------------------
PRIORS: dict[str, Prior] = {
    "relevant_forest_fraction": Prior(
        "beta", {"a": 6, "b": 2},
        "Fraction of the gazetted CFR's mapped polygon that is forest/plantable "
        "land at all (excludes roads, water, rock, settlement inclusions inside "
        "the boundary). Broad conservative placeholder (mean ~0.75); no land-cover "
        "classification has been run against these specific polygons yet.",
    ),
    "stocked_fraction": Prior(
        "beta", {"a": 3, "b": 3},
        "Fraction of relevant forest area that still carries standing trees at "
        "all, as opposed to cleared/encroached/degraded. Deliberately wide "
        "(mean 0.5) -- Uganda CFR encroachment is a real, documented issue for "
        "at least some reserves in this catchment (e.g. Kapimpini's own "
        "NFA/Wikipedia record notes settlement and deforestation pressure), but "
        "no per-CFR encroachment survey exists here.",
    ),
    "mature_harvestable_fraction": Prior(
        "beta", {"a": 2, "b": 3},
        "Fraction of stocked area with trees old/large enough to be harvest-"
        "relevant now, as opposed to young regrowth. No age-class survey exists "
        "for any of these CFRs; kept broad and below 0.5 on average (mean ~0.4) "
        "as a conservative default rather than assuming a mature, fully-stocked "
        "estate.",
    ),
    "commercial_availability_fraction": Prior(
        "beta", {"a": 2, "b": 4},
        "Fraction of mature/harvestable volume that is actually legally and "
        "commercially accessible (permits, management plan status, landholder/"
        "NFA access, no protection overlay). This is explicitly NOT inferred "
        "from EO -- EO cannot see legal status. Kept conservative and wide "
        "(mean ~0.33) precisely because this is the least EO-informable factor "
        "in the whole chain.",
    ),
    "stems_per_ha": Prior(
        "normal", {"mean": 500.0, "std": 150.0, "min": 50.0},
        "Stems/ha for a natural/mixed Uganda CFR stand (lower than an intensive "
        "eucalyptus plantation's ~1,100/ha baseline used elsewhere in this repo's "
        "AssetGroup scenario data -- these are gazetted natural forest estates, "
        "not plantation compartments). Generic placeholder, not surveyed.",
    ),
    "mean_tree_dbh_cm": Prior(
        "normal", {"mean": 25.0, "std": 8.0, "min": 5.0},
        "Mean DBH assumption for mixed natural forest, broad std. Not surveyed.",
    ),
    "mean_tree_height_m": Prior(
        "normal", {"mean": 15.0, "std": 5.0, "min": 3.0},
        "Mean tree height assumption, broad std. Not surveyed.",
    ),
    "wood_density_t_per_m3": Prior(
        "normal", {"mean": 0.55, "std": 0.08, "min": 0.25},
        "Generic mixed tropical hardwood basic density placeholder. Not species-"
        "specific because real species composition is unverified for this "
        "natural-forest catchment (see module docstring's species simplification).",
    ),
    "within_stand_dbh_cv": Prior(
        "normal", {"mean": 0.35, "std": 0.08, "min": 0.1},
        "Coefficient of variation of individual-tree DBH within a stand around "
        "its sampled mean -- captures that a stand with a given *mean* DBH still "
        "has some trees above and below a processor's grade threshold, rather "
        "than treating the whole stand as one uniform tree. Generic broad-forest "
        "placeholder, not measured for these CFRs.",
    ),
}

FORM_FACTOR = 0.45  # reused from roundwood_production.py's own default

# Effort/cost midpoints reused conceptually from roundwood_production.py's
# retail_quantity_library()/labour/nonlab tables -- this module samples its
# own lambda (effort/wage/price position) per Monte Carlo draw rather than
# re-deriving the exact itemised day-by-day breakdown, so it calls the same
# *tables* directly instead of the itemised dataframe builder (which is
# designed around one deterministic scenario, not an outer Monte Carlo loop).
_LABOUR = retail_labour_categories().set_index("labour_code")
_NONLAB = retail_nonlab_items().set_index("item_code")
_QTY = retail_quantity_library()


def _lin(rng: np.random.Generator, n: int, lo: float, hi: float) -> np.ndarray:
    return lo + rng.random(n) * (hi - lo)


def _wage(code: str, lam: np.ndarray) -> np.ndarray:
    row = _LABOUR.loc[code]
    return row["wage_min"] + lam * (row["wage_max"] - row["wage_min"])


def _price(code: str, lam: np.ndarray) -> np.ndarray:
    row = _NONLAB.loc[code]
    return row["price_min"] + lam * (row["price_max"] - row["price_min"])


@dataclass
class CfrSupplyState:
    entity_id: str
    canonical_name: str
    gross_area_ha: float
    distance_km: float
    road_km: float | None
    route_source: str
    eo_evidence_status: str
    processor_spec_key: str
    n_draws: int
    rng_seed: int
    # MODELLED quantiles (P10/P50/P90), all in physical/USD units.
    relevant_stocked_area_ha: dict[str, float] = field(default_factory=dict)
    standing_volume_m3: dict[str, float] = field(default_factory=dict)
    harvestable_volume_m3: dict[str, float] = field(default_factory=dict)
    zurkt_suitable_volume_m3: dict[str, float] = field(default_factory=dict)
    grade_share_g1: dict[str, float] = field(default_factory=dict)
    grade_share_g2: dict[str, float] = field(default_factory=dict)
    grade_share_g3: dict[str, float] = field(default_factory=dict)
    harvest_extract_load_cost_usd_per_m3: dict[str, float] = field(default_factory=dict)
    haulage_cost_usd_per_m3: dict[str, float] = field(default_factory=dict)
    delivered_cost_usd_per_m3: dict[str, float] = field(default_factory=dict)
    annual_suitable_supply_m3: dict[str, float] = field(default_factory=dict)


def quantiles(x: np.ndarray) -> dict[str, float]:
    p10, p50, p90 = np.percentile(x, [10, 50, 90])
    return {"p10": round(float(p10), 2), "p50": round(float(p50), 2), "p90": round(float(p90), 2)}


def _tree_volume_m3(dbh_cm: np.ndarray, h_m: np.ndarray) -> np.ndarray:
    dbh_m = dbh_cm / 100.0
    basal_area = math.pi * (dbh_m / 2.0) ** 2
    return FORM_FACTOR * basal_area * h_m


def _normal_survival(threshold: np.ndarray, mean: np.ndarray, std: np.ndarray) -> np.ndarray:
    """P(X >= threshold) for X ~ Normal(mean, std), vectorized, no scipy
    dependency (erf is in the stdlib math module -- vectorized manually
    since math.erf is scalar-only)."""
    z = (threshold - mean) / np.maximum(std, 1e-6)
    erf = np.vectorize(math.erf)(z / math.sqrt(2))
    return np.clip(1.0 - 0.5 * (1.0 + erf), 0.0, 1.0)


def _grade_shares(dbh_cm: np.ndarray, dbh_std_cm: np.ndarray, spec: dict[str, Any]) -> dict[str, np.ndarray]:
    """Fraction of a stand's trees falling in each grade, treating DBH as
    normally distributed around the sampled stand mean (Track 4: a stand
    with mean DBH below a threshold still contributes some qualifying
    trees, and vice versa). Height thresholds in this repo's specs are all
    low (2.7 m) against a >>3 m mean-height prior, so height is treated as
    non-binding here -- documented simplification, not hidden."""
    g = spec["grades"]
    p_ge_g1 = _normal_survival(np.full_like(dbh_cm, g["g1"]["dbh_min"]), dbh_cm, dbh_std_cm)
    p_ge_g2 = _normal_survival(np.full_like(dbh_cm, g["g2"]["dbh_min"]), dbh_cm, dbh_std_cm)
    p_ge_g3 = _normal_survival(np.full_like(dbh_cm, g["g3"]["dbh_min"]), dbh_cm, dbh_std_cm)
    share_g1 = p_ge_g1
    share_g2 = np.clip(p_ge_g2 - p_ge_g1, 0.0, 1.0)
    share_g3 = np.clip(p_ge_g3 - p_ge_g2, 0.0, 1.0)
    share_reject = np.clip(1.0 - p_ge_g3, 0.0, 1.0)
    return {"G1": share_g1, "G2": share_g2, "G3": share_g3, "Reject": share_reject}


def build_cfr_supply_state(
    *,
    entity_id: str,
    canonical_name: str,
    gross_area_ha: float,
    distance_km: float,
    road_km: float | None,
    route_source: str,
    eo_evidence_status: str,
    processor_spec_key: str = "STANDARD",
    payload_direct_m3: float = 10.0,
    n_draws: int = 2_000,
    rng_seed: int = 7,
) -> tuple[CfrSupplyState, dict[str, Any]]:
    """Run the CFR-level Monte Carlo (Track 4/10) for one catchment CFR
    against one processor-specification scenario (Track 7). Road distance
    is used when available (route_source == "osrm"); otherwise falls back
    to straight-line distance x 1.35 (the same fallback ratio this repo's
    frontend already uses in dashboard-asset-map.tsx), and this is recorded
    in the state, never silently presented as a routed distance.
    """
    rng = np.random.default_rng(rng_seed)
    n = int(n_draws)
    spec = PROCESSOR_SPECIFICATION_SCENARIOS[processor_spec_key]

    relevant_frac = PRIORS["relevant_forest_fraction"].sample(rng, n)
    stocked_frac = PRIORS["stocked_fraction"].sample(rng, n)
    mature_frac = PRIORS["mature_harvestable_fraction"].sample(rng, n)
    avail_frac = PRIORS["commercial_availability_fraction"].sample(rng, n)
    stems_per_ha = PRIORS["stems_per_ha"].sample(rng, n)
    dbh = PRIORS["mean_tree_dbh_cm"].sample(rng, n)
    height = PRIORS["mean_tree_height_m"].sample(rng, n)
    density = PRIORS["wood_density_t_per_m3"].sample(rng, n)
    dbh_cv = PRIORS["within_stand_dbh_cv"].sample(rng, n)
    dbh_std = dbh * dbh_cv

    relevant_area_ha = gross_area_ha * relevant_frac
    stocked_area_ha = relevant_area_ha * stocked_frac
    harvestable_area_ha = stocked_area_ha * mature_frac
    available_area_ha = harvestable_area_ha * avail_frac

    tree_vol_m3 = np.maximum(_tree_volume_m3(dbh, height), 0.0)
    stems_stocked = stocked_area_ha * stems_per_ha
    stems_harvestable = harvestable_area_ha * stems_per_ha
    stems_available = available_area_ha * stems_per_ha

    standing_volume_m3 = stems_stocked * tree_vol_m3
    harvestable_volume_m3 = stems_harvestable * tree_vol_m3
    available_volume_m3 = stems_available * tree_vol_m3

    grade_shares = _grade_shares(dbh, dbh_std, spec)
    g1_share = grade_shares["G1"]
    merchantable_share = grade_shares["G1"] + grade_shares["G2"] + grade_shares["G3"]
    zurkt_suitable_volume_m3 = available_volume_m3 * merchantable_share

    # --- Harvest / extraction / loading cost per m3 (Track 8), reusing
    # roundwood_production.py's wage/price tables and quantity ranges, but
    # vectorized across draws rather than the itemised per-scenario dataframe
    # (which is built for one deterministic call, not an outer Monte Carlo).
    lam_wage = rng.random(n)
    lam_price = rng.random(n)
    v_fell = rng.random(n)
    v_extr = rng.random(n)
    v_load = rng.random(n)
    allowance = _price("N_CREW_DAYALLOW", rng.random(n))

    vol_safe = np.maximum(zurkt_suitable_volume_m3, 1e-6)
    q_f = _QTY["felling"]["chainsaw"]
    stems_per_crew_day = q_f["stems_per_crew_day"][1] - v_fell * (q_f["stems_per_crew_day"][1] - q_f["stems_per_crew_day"][0])
    crew_days_fell = np.ceil(np.maximum(stems_available, 1.0) / np.maximum(stems_per_crew_day, 1e-6))
    fell_cost = crew_days_fell * (_wage("L_CHAINSAW_OPERATOR", lam_wage) + _wage("L_CHAINSAW_ASSIST", lam_wage) + 0.5 * allowance)

    q_e = _QTY["extraction"]["tractor"]
    op_days_extr = np.ceil(available_area_ha * (q_e["machine_op_days_per_ha"][0] + v_extr * (q_e["machine_op_days_per_ha"][1] - q_e["machine_op_days_per_ha"][0])))
    fuel_extr_l = vol_safe * (q_e["fuel_L_per_m3"][0] + v_extr * (q_e["fuel_L_per_m3"][1] - q_e["fuel_L_per_m3"][0]))
    extr_cost = op_days_extr * (_wage("L_MACHINE_OPERATOR", lam_wage) + _price("N_RENT_TRACTOR", lam_price)) + fuel_extr_l * _price("N_FUEL_L", lam_price)

    payload_m3 = max(float(payload_direct_m3), 1e-9)
    trips = np.ceil(vol_safe / payload_m3)
    q_l = _QTY["loading"]["machine"]
    op_days_load = trips * (q_l["machine_op_days_per_trip"][0] + v_load * (q_l["machine_op_days_per_trip"][1] - q_l["machine_op_days_per_trip"][0]))
    fuel_load_l = trips * (q_l["fuel_L_per_trip"][0] + v_load * (q_l["fuel_L_per_trip"][1] - q_l["fuel_L_per_trip"][0]))
    load_cost = op_days_load * (_wage("L_MACHINE_OPERATOR", lam_wage) + _price("N_RENT_LOADER", lam_price)) + fuel_load_l * _price("N_FUEL_L", lam_price)

    hel_cost_per_m3 = (fell_cost + extr_cost + load_cost) / vol_safe

    # --- Haulage (Track 8/3): real road_km when available, else a flagged
    # straight-line fallback -- the ratio matches this repo's own existing
    # frontend fallback (dashboard-asset-map.tsx getEstimatedRoadDistanceKm).
    if road_km is not None and route_source == "osrm":
        haul_km = float(road_km)
        haul_km_source = "osrm"
    else:
        haul_km = float(distance_km) * 1.35
        haul_km_source = "straight_line_x1.35_fallback"

    q_h = _QTY["haulage"]
    v_haul = rng.random(n)
    op_days_haul = trips * (q_h["machine_op_days_per_trip"][0] + v_haul * (q_h["machine_op_days_per_trip"][1] - q_h["machine_op_days_per_trip"][0]))
    fuel_haul_l = (trips * haul_km) * (q_h["fuel_L_per_km"][0] + v_haul * (q_h["fuel_L_per_km"][1] - q_h["fuel_L_per_km"][0]))
    haul_cost = op_days_haul * (_wage("L_MACHINE_OPERATOR", lam_wage) + _price("N_RENT_TRUCK", lam_price)) + fuel_haul_l * _price("N_FUEL_L", lam_price)
    haul_cost_per_m3 = haul_cost / vol_safe

    # Standing-timber/procurement + regulatory/admin (kept small & separate
    # per Track 9 -- not folded silently into one number).
    q_r = _QTY["regulatory"]
    permit_cost_per_ha = _price("N_NFA_PERMIT", lam_price) / max(q_r["permit_ha_covered"][0], 1.0)
    reg_admin_cost_per_m3 = (available_area_ha * permit_cost_per_ha) / vol_safe

    # NOTE: _wage()/_price() draw from roundwood_production.py's
    # retail_labour_categories()/retail_nonlab_items(), which are already
    # USD-denominated (money_columns_to_usd() is applied inside those
    # functions) -- every cost term above is already in USD. Do not divide
    # by UGX_PER_USD again here (an earlier version of this module did,
    # silently shrinking every delivered-cost figure ~3700x).
    delivered_cost_usd_per_m3 = hel_cost_per_m3 + haul_cost_per_m3 + reg_admin_cost_per_m3

    annual_suitable_supply_m3 = zurkt_suitable_volume_m3 * PRIORS_ANNUAL_HARVEST_FRACTION.sample(rng, n)

    return CfrSupplyState(
        entity_id=entity_id,
        canonical_name=canonical_name,
        gross_area_ha=gross_area_ha,
        distance_km=distance_km,
        road_km=road_km,
        route_source=route_source,
        eo_evidence_status=eo_evidence_status,
        processor_spec_key=processor_spec_key,
        n_draws=n,
        rng_seed=rng_seed,
        relevant_stocked_area_ha=quantiles(stocked_area_ha),
        standing_volume_m3=quantiles(standing_volume_m3),
        harvestable_volume_m3=quantiles(harvestable_volume_m3),
        zurkt_suitable_volume_m3=quantiles(zurkt_suitable_volume_m3),
        grade_share_g1=quantiles(g1_share),
        grade_share_g2=quantiles(grade_shares["G2"]),
        grade_share_g3=quantiles(grade_shares["G3"]),
        harvest_extract_load_cost_usd_per_m3=quantiles(hel_cost_per_m3),
        haulage_cost_usd_per_m3=quantiles(haul_cost_per_m3),
        delivered_cost_usd_per_m3=quantiles(delivered_cost_usd_per_m3),
        annual_suitable_supply_m3=quantiles(annual_suitable_supply_m3),
    ), {
        "haul_km_used": haul_km,
        "haul_km_source": haul_km_source,
        "raw_zurkt_suitable_volume_m3": zurkt_suitable_volume_m3,
        "raw_delivered_cost_usd_per_m3": delivered_cost_usd_per_m3,
        "raw_annual_suitable_supply_m3": annual_suitable_supply_m3,
        "raw_standing_volume_m3": standing_volume_m3,
        "raw_harvestable_volume_m3": harvestable_volume_m3,
    }


# ASSUMED (Track 12): what fraction of the "suitable" standing volume could
# realistically be harvested in a single year vs. spread across a rotation.
# Broad and conservative -- no harvest scheduling data exists for any CFR
# in this catchment.
PRIORS_ANNUAL_HARVEST_FRACTION = Prior(
    "beta", {"a": 2, "b": 8},
    "Fraction of Zurkt-suitable standing volume harvested in any single year "
    "(as opposed to spread across a multi-year rotation). Kept low and "
    "conservative (mean 0.2) in the absence of any real harvest-scheduling "
    "or management-plan evidence for these CFRs.",
)
