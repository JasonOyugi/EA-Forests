"""Zurkt/Evergreen Uganda supply scenario -- CFR-level stochastic supply
state, now with a hierarchical (systemic/regional/CFR-specific/measurement)
uncertainty model (see SCENARIO_VERSION below).

This module turns the real 276-CFR catchment around the verified Evergreen
Wood Industries Ltd processor node (zurkt_supply_catchment.py /
zurkt_road_distance.py) into an uncertainty-aware answer to "how much
roundwood could plausibly reach Evergreen, from where, at what cost" --
without ever presenting an assumption as an observation. Four classes of
quantity are kept explicitly separate throughout (never blurred):

  OBSERVED  -- CFR geometry, area, canonical entity/AOI identity, real EO
              observation counts (including per-CFR NDVI time series --
              see the EO-CONDITIONED tier below). Comes straight from the
              operational canonical database (ea_forests_uganda_country_pass).
  DERIVED   -- straight-line and road-network distance/time (computed from
              OBSERVED geometry via haversine/OSRM, not assumed).
  ASSUMED   -- everything about stand composition, stocking, maturity,
              commercial availability, and the processor's own
              specification. No field inventory exists for any of these
              276 CFRs -- these are explicit, broad, conservative priors/
              scenarios, not observations. Every ASSUMED quantity below
              carries a `rationale` string. As of v3, these are organized
              into hierarchical tiers (systemic/regional/CFR-specific/
              measurement -- see the HIERARCHICAL UNCERTAINTY block
              further down) rather than all being independent per-CFR draws.
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
caller-supplied stand exists for any of these 276 real forests.

KNOWN SIMPLIFICATION (documented, not hidden): roundwood_production.py's
grade/price library is built for eucalyptus/pine plantation logs. Uganda's
gazetted Central Forest Reserves are natural/mixed estate whose real
species composition is unverified (though Evergreen's own real export
records DO confirm eucalyptus veneer as a genuine relevant product for
this specific processor -- see zurkt_supply_catchment.py). This model
still prices ALL catchment supply as "eucalyptus-equivalent" for grading/
pricing purposes -- a major, explicitly-flagged simplification, not a
species observation for every CFR. A follow-up with real per-CFR species
survey data should replace this.
"""

from __future__ import annotations

import hashlib
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

SCENARIO_VERSION = "zurkt-evergreen-uganda-supply-scenario-v3"
MODEL_VERSION = "zurkt-cfr-monte-carlo-hierarchical-v3"

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
        out = np.maximum(rng.normal(mean, std, size=n), self.params.get("min", 1e-6))
        if "max" in self.params:
            out = np.minimum(out, self.params["max"])
        return out

    def widened(self, factor: float) -> "Prior":
        """Same mean, wider spread -- factor<1 widens a Beta prior (lower
        a+b concentration, same a/(a+b) mean) or scales a Normal prior's std
        up by 1/factor. Used for MEASUREMENT-tier uncertainty (Track v3-2):
        a CFR with no EO observations yet gets a wider, not different-mean,
        prior than an observed one."""
        if self.kind == "beta":
            return Prior("beta", {"a": self.params["a"] * factor, "b": self.params["b"] * factor}, self.rationale, self.evidence_class)
        new_params = dict(self.params)
        new_params["std"] = self.params["std"] / max(factor, 1e-6)
        return Prior("normal", new_params, self.rationale, self.evidence_class)


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
    "stumpage_price_usd_per_m3": Prior(
        "normal", {"mean": 12.0, "std": 5.0, "min": 1.0},
        "Standing-timber/procurement price paid at the forest gate before any "
        "harvest, extraction, haulage or regulatory cost is incurred -- i.e. what "
        "Evergreen (or an intermediary) would pay NFA/the community/private "
        "landholder for the standing wood itself. No real Uganda CFR stumpage "
        "price observation exists in this repository; this is a broad, "
        "conservative placeholder distinct from -- and never blended into -- the "
        "harvest/extraction/haulage/regulatory cost lines below, per the sprint's "
        "explicit requirement to report procurement cost as its own line item.",
    ),
}

# ---------------------------------------------------------------------------
# HIERARCHICAL UNCERTAINTY (v3). With ~276 independently-drawn CFRs, purely
# independent per-CFR noise averages out far more aggressively than our real
# knowledge justifies -- most of what we are actually unsure about is NOT
# "CFR 143's stocking happens to differ from CFR 144's", it is "our whole
# approach to estimating stocking/access/pricing across ALL of Uganda's CFRs
# might be biased in one direction." Four uncertainty tiers, in decreasing
# order of how much they resist averaging out across CFRs:
#
#   SYSTEMIC/GLOBAL   -- one shared draw per Monte Carlo world, applied
#                        IDENTICALLY to every CFR in that world. Does NOT
#                        shrink as CFR count grows. See GlobalDraws.
#   REGIONAL/CLUSTER  -- one shared draw per (grid-cell region, world),
#                        applied to every CFR in that region. Shrinks with
#                        the number of INDEPENDENT regions, not CFRs. See
#                        RegionalDraws / assign_region().
#   CFR-SPECIFIC      -- the original independent per-CFR Beta/Normal draws
#                        in PRIORS above. Genuinely averages out across 276
#                        CFRs (this was the ONLY tier in v1/v2, which is
#                        exactly the bug this sprint fixes).
#   MEASUREMENT       -- CFR-specific, but wider for CFRs with no EO
#                        observations yet (Prior.widened()) -- a coarse,
#                        transparent proxy for "we know less about this CFR
#                        specifically," not a fourth independent quantity.
#
# A full hierarchical Bayesian model (e.g. a Gaussian process over space)
# is NOT implemented here -- explicitly out of scope per the sprint's own
# instruction ("a simple hierarchical random-effect structure is sufficient
# for v3... do not build a giant Gaussian process unless needed"). Regions
# are a placeholder 0.5-degree lat/lon grid (~55km cells), not real
# ecological or administrative zones -- documented as a first cut.
# ---------------------------------------------------------------------------

REGION_CELL_DEG = 0.5

GLOBAL_STOCKING_MODEL_BIAS_PRIOR = Prior(
    "normal", {"mean": 1.0, "std": 0.15, "min": 0.5, "max": 1.6},
    "SYSTEMIC: one shared multiplicative bias per Monte Carlo world, applied to "
    "EVERY CFR's relevant-forest-fraction simultaneously. Represents the "
    "possibility that our whole generic land-cover/stocking approach is "
    "systematically optimistic or pessimistic for Uganda CFRs as a class -- not "
    "an independent per-CFR quantity, so it does not average out across 276 CFRs.",
)
GLOBAL_GRADE_RECOVERY_DBH_BIAS_PRIOR = Prior(
    "normal", {"mean": 0.0, "std": 3.0},
    "SYSTEMIC: one shared additive DBH bias (cm) per Monte Carlo world, applied to "
    "EVERY CFR's sampled mean DBH before grade shares/volume are computed. "
    "Represents shared growth/model-form uncertainty (e.g. if typical natural-"
    "forest DBH in this catchment differs systematically from the generic prior) "
    "-- the same bias applies everywhere in a given world, not drawn per CFR.",
)
GLOBAL_FUEL_PRICE_LAMBDA_PRIOR = Prior(
    "normal", {"mean": 0.5, "std": 0.25, "min": 0.0, "max": 1.0},
    "SYSTEMIC: one shared fuel-price regime (position within roundwood_production's "
    "N_FUEL_L price range) per Monte Carlo world, applied to every CFR's fuel cost "
    "line identically -- fuel prices move together nationally, they are not "
    "independent CFR-by-CFR.",
)
REGIONAL_STOCKED_MULTIPLIER_PRIOR = Prior(
    "normal", {"mean": 1.0, "std": 0.25, "min": 0.4, "max": 1.8},
    "REGIONAL: one shared multiplicative shock on stocked_fraction per (grid-cell "
    "region, world), applied to every CFR in that ~55km cell -- stocking/"
    "encroachment plausibly correlates with local rainfall/ecology/management "
    "pressure rather than varying independently CFR-by-CFR. Placeholder grid "
    "regions (assign_region()), not real ecological/administrative zones.",
)
REGIONAL_MATURITY_MULTIPLIER_PRIOR = Prior(
    "normal", {"mean": 1.0, "std": 0.2, "min": 0.4, "max": 1.8},
    "REGIONAL: one shared multiplicative shock on mature_harvestable_fraction per "
    "(grid-cell region, world) -- age-class structure plausibly correlates with "
    "local management history more than it varies independently CFR-by-CFR.",
)
MEASUREMENT_WIDEN_FACTOR = 0.6  # <1 widens a Beta prior's spread while preserving its mean


@dataclass
class GlobalDraws:
    """SYSTEMIC tier: every array here has the SAME value applied to every
    CFR at a given draw index -- these do NOT shrink as the CFR count (276)
    grows, unlike independent CFR-specific noise."""

    commercial_availability_fraction: np.ndarray
    stumpage_price_usd_per_m3: np.ndarray
    fuel_price_lambda: np.ndarray
    avg_truck_speed_kmph: np.ndarray
    stocking_model_bias: np.ndarray
    grade_recovery_dbh_bias_cm: np.ndarray


def sample_global_draws(rng: np.random.Generator, n: int) -> GlobalDraws:
    """Sample ONCE per Monte Carlo world (n draws), then pass the SAME
    object to every CFR's build_cfr_supply_state call so every CFR sees the
    identical global regime at each draw index."""
    return GlobalDraws(
        commercial_availability_fraction=PRIORS["commercial_availability_fraction"].sample(rng, n),
        stumpage_price_usd_per_m3=PRIORS["stumpage_price_usd_per_m3"].sample(rng, n),
        fuel_price_lambda=GLOBAL_FUEL_PRICE_LAMBDA_PRIOR.sample(rng, n),
        avg_truck_speed_kmph=AVG_TRUCK_SPEED_KMPH_PRIOR.sample(rng, n),
        stocking_model_bias=GLOBAL_STOCKING_MODEL_BIAS_PRIOR.sample(rng, n),
        grade_recovery_dbh_bias_cm=GLOBAL_GRADE_RECOVERY_DBH_BIAS_PRIOR.sample(rng, n),
    )


@dataclass
class RegionalDraws:
    """REGIONAL tier: shared across every CFR assigned to the same grid-cell
    region, independent of every OTHER region's draws."""

    stocked_fraction_multiplier: np.ndarray
    maturity_multiplier: np.ndarray


def assign_region(lat: float, lon: float, cell_deg: float = REGION_CELL_DEG) -> str:
    """Placeholder spatial cluster: a 0.5-degree (~55km) lat/lon grid cell.
    Not a real ecological or administrative region -- a documented first cut
    (see module note above) standing in for one until a real forest-type/
    rainfall-zone/management-region layer is ingested."""
    return f"R{round(lat / cell_deg)}_{round(lon / cell_deg)}"


def _deterministic_region_seed(region_id: str, base_seed: int) -> int:
    """Regions need independent-of-each-other but reproducible-across-runs
    seeds. Python's built-in hash() is randomized per-process for strings,
    so it cannot be used here -- sha256 gives the same seed every run."""
    digest = hashlib.sha256(region_id.encode("utf-8")).hexdigest()
    return (base_seed + int(digest[:8], 16)) % (2**31 - 1)


def sample_regional_draws_by_region(region_ids: list[str], n: int, base_seed: int = 9001) -> dict[str, RegionalDraws]:
    out: dict[str, RegionalDraws] = {}
    for region_id in sorted(set(region_ids)):
        rng = np.random.default_rng(_deterministic_region_seed(region_id, base_seed))
        out[region_id] = RegionalDraws(
            stocked_fraction_multiplier=REGIONAL_STOCKED_MULTIPLIER_PRIOR.sample(rng, n),
            maturity_multiplier=REGIONAL_MATURITY_MULTIPLIER_PRIOR.sample(rng, n),
        )
    return out


# ---------------------------------------------------------------------------
# MATERIAL/SPECIES MIX (Track v4-5). Replaces the blanket "eucalyptus-
# equivalent" assumption with an explicit CATEGORICAL mixture per CFR, per
# draw -- so an "unresolved/natural forest" CFR does NOT silently inherit
# eucalyptus-veneer recovery. Real evidence hierarchy, strongest first:
#   1. direct source/inventory -- none exists for any of these 276 CFRs.
#   2. plantation datasets -- none ingested in this repo for this catchment.
#   3. EO structural/temporal pattern -- NOT used to directly classify
#      species (that would be exactly the "NDVI -> species" shortcut the
#      sprint explicitly forbids); left for a future, more careful pass.
#   4. documented plantation history -- real, external, per-CFR evidence
#      from zurkt_material_class_evidence.py's web-research overlay, where
#      it exists (see that script; currently populated only for the
#      highest-VOI CFRs actually researched).
#   5. broad prior -- DEFAULT_MATERIAL_MIX_PROBS below, for every CFR with
#      no stronger evidence. Deliberately dominated by "natural/mixed
#      forest" and "unresolved", NOT eucalyptus, because these are gazetted
#      Central Forest Reserves (natural estate by default), not enrolled
#      commercial plantations -- a real minority of Uganda CFRs ARE known
#      timber plantations (e.g. under NFA-licensed private management), but
#      asserting that for an unresearched CFR would be fabrication.
# ---------------------------------------------------------------------------
MATERIAL_CLASSES = [
    "eucalyptus_plantation",
    "pine_plantation",
    "mixed_plantation",
    "natural_hardwood_mixed",
    "degraded_open",
    "unresolved",
]

DEFAULT_MATERIAL_MIX_PROBS = {
    "eucalyptus_plantation": 0.12,
    "pine_plantation": 0.08,
    "mixed_plantation": 0.05,
    "natural_hardwood_mixed": 0.55,
    "degraded_open": 0.15,
    "unresolved": 0.05,
}

# How suitable each material class is for EVERGREEN'S SPECIFIC product
# (real, evidenced eucalyptus veneer -- see zurkt_supply_catchment.py). This
# is a processor-fit multiplier applied on TOP of the existing DBH-based
# grade-share calculation, not a replacement for it -- grade shares answer
# "is this log big enough", material fit answers "is this log the right
# species/product for THIS processor at all". Broad, ASSUMED, not measured.
MATERIAL_PROCESSOR_FIT: dict[str, float] = {
    "eucalyptus_plantation": 1.0,
    "pine_plantation": 0.3,
    "mixed_plantation": 0.5,
    "natural_hardwood_mixed": 0.2,
    "degraded_open": 0.05,
    "unresolved": 0.3,
}


def sample_material_class_indices(rng: np.random.Generator, n: int, mix_probs: dict[str, float] | None = None) -> np.ndarray:
    """One material-class draw PER Monte Carlo draw for one CFR (not one
    fixed class for the whole CFR) -- reflects genuine uncertainty about
    what is actually growing there, not a false point classification."""
    probs = mix_probs or DEFAULT_MATERIAL_MIX_PROBS
    classes = list(probs.keys())
    p = np.array([probs[c] for c in classes], dtype=float)
    p = p / p.sum()
    idx = rng.choice(len(classes), size=n, p=p)
    return idx


def material_fit_multiplier(class_indices: np.ndarray, mix_probs: dict[str, float] | None = None) -> np.ndarray:
    classes = list((mix_probs or DEFAULT_MATERIAL_MIX_PROBS).keys())
    fit_by_index = np.array([MATERIAL_PROCESSOR_FIT[c] for c in classes])
    return fit_by_index[class_indices]


FORM_FACTOR = 0.45  # reused from roundwood_production.py's own default

HOURS_PER_WORKDAY = 8.0  # ASSUMED, standard rural haulage workday
AVG_TRUCK_SPEED_KMPH_PRIOR = Prior(
    "normal", {"mean": 30.0, "std": 8.0, "min": 10.0},
    "Average round-trip truck speed on Uganda feeder/rural roads between a CFR "
    "and the Mpigi processor, accounting for a realistic mix of murram and "
    "tarmac and typical loaded-truck speeds -- not a surveyed speed for any "
    "specific route. Used to make haulage driving TIME (and therefore "
    "wage/rental cost, not just fuel) scale with distance -- addressing the "
    "documented v1 limitation that delivered cost was only weakly "
    "distance-sensitive.",
)

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
    procurement_cost_usd_per_m3: dict[str, float] = field(default_factory=dict)
    harvest_extract_load_cost_usd_per_m3: dict[str, float] = field(default_factory=dict)
    haulage_cost_usd_per_m3: dict[str, float] = field(default_factory=dict)
    regulatory_admin_cost_usd_per_m3: dict[str, float] = field(default_factory=dict)
    delivered_cost_usd_per_m3: dict[str, float] = field(default_factory=dict)
    annual_suitable_supply_m3: dict[str, float] = field(default_factory=dict)
    material_class_probabilities: dict[str, float] = field(default_factory=dict)
    material_class_evidence: str = "broad_prior"


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
    global_draws: GlobalDraws,
    regional_draws: RegionalDraws,
    region_id: str,
    eo_forest_cover_multiplier: float = 1.0,
    eo_maturity_multiplier: float = 1.0,
    material_mix_probs: dict[str, float] | None = None,
    freeze_variable: str | None = None,
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

    global_draws/regional_draws MUST come from the same n_draws-length
    arrays shared across every CFR in one model run (see
    sample_global_draws/sample_regional_draws_by_region) -- rng_seed only
    drives this CFR's own CFR-SPECIFIC residual noise (below), never the
    global/regional tiers, which is exactly what makes them "hierarchical"
    rather than independent.
    """
    rng = np.random.default_rng(rng_seed)
    n = int(n_draws)
    spec = PROCESSOR_SPECIFICATION_SCENARIOS[processor_spec_key]

    # MEASUREMENT tier (Track v3-2): a CFR with no EO observations processed
    # yet gets a WIDER (not differently-centered) prior for the two
    # fractions EO could plausibly help constrain -- forested/stocked
    # extent and disturbance-adjacent maturity. This is a coarse, transparent
    # proxy, not a real EO-conditioned posterior (see Track v3-10/11 for why
    # a full belief object is not attempted here).
    observed = eo_evidence_status == "observed"
    relevant_prior = PRIORS["relevant_forest_fraction"] if observed else PRIORS["relevant_forest_fraction"].widened(MEASUREMENT_WIDEN_FACTOR)
    stocked_prior = PRIORS["stocked_fraction"] if observed else PRIORS["stocked_fraction"].widened(MEASUREMENT_WIDEN_FACTOR)

    # CFR-SPECIFIC tier: independent per-CFR draws (this was the ONLY tier
    # in v1/v2 -- averages out across 276 CFRs, which is realistic for truly
    # local variation but was wrongly being applied to systemic/regional
    # quantities too).
    relevant_frac_cfr = relevant_prior.sample(rng, n)
    stocked_frac_cfr = stocked_prior.sample(rng, n)
    mature_frac_cfr = PRIORS["mature_harvestable_fraction"].sample(rng, n)
    stems_per_ha = PRIORS["stems_per_ha"].sample(rng, n)
    dbh_cfr = PRIORS["mean_tree_dbh_cm"].sample(rng, n)
    height = PRIORS["mean_tree_height_m"].sample(rng, n)
    density = PRIORS["wood_density_t_per_m3"].sample(rng, n)
    dbh_cv = PRIORS["within_stand_dbh_cv"].sample(rng, n)

    # REGIONAL tier: this CFR's grid-cell region's shared shock, applied to
    # every other CFR in the same region identically at each draw index.
    stocked_frac = np.clip(stocked_frac_cfr * regional_draws.stocked_fraction_multiplier, 0.0, 1.0)
    mature_frac = np.clip(mature_frac_cfr * regional_draws.maturity_multiplier, 0.0, 1.0)

    # SYSTEMIC/GLOBAL tier: the SAME draw applied to every CFR in the whole
    # catchment at each draw index -- does not shrink as CFR count grows.
    relevant_frac_pre_eo = np.clip(relevant_frac_cfr * global_draws.stocking_model_bias, 0.0, 1.0)
    dbh = np.maximum(dbh_cfr + global_draws.grade_recovery_dbh_bias_cm, 5.0)
    avail_frac = global_draws.commercial_availability_fraction
    dbh_std = dbh * dbh_cv

    # EO-CONDITIONED tier (Track v3-10): bounded multipliers derived from
    # this CFR's REAL NDVI time series (zurkt_eo_conditioned_priors.py) --
    # applied on top of everything above, never replacing it. Default 1.0
    # (no nudge) when no EO conditioning was supplied, so this is fully
    # backward compatible with callers that don't pass it.
    relevant_frac = np.clip(relevant_frac_pre_eo * eo_forest_cover_multiplier, 0.0, 1.0)
    stocked_frac = np.clip(stocked_frac * eo_forest_cover_multiplier, 0.0, 1.0)
    mature_frac = np.clip(mature_frac * eo_maturity_multiplier, 0.0, 1.0)

    # EVSI simulation (Track v3-15): "if we perfectly verified THIS CFR's
    # true value of one variable, how much would the decision-relevant
    # output change" -- collapses that ONE variable to its own realized
    # mean for THIS CFR ONLY (every other CFR, and every other variable for
    # this CFR, stays fully stochastic). Decoupled from whatever global/
    # regional regime applied, since a field verification would supersede
    # both for this specific CFR. None (the default) leaves everything
    # untouched -- this branch is inert for every normal production run.
    if freeze_variable == "access_legal_status":
        avail_frac = np.full(n, float(np.mean(avail_frac)))
    elif freeze_variable == "stocked_fraction":
        stocked_frac = np.full(n, float(np.mean(stocked_frac)))
    elif freeze_variable == "maturity":
        mature_frac = np.full(n, float(np.mean(mature_frac)))
    elif freeze_variable == "species_processor_fit":
        dbh = np.full(n, float(np.mean(dbh)))
        dbh_std = np.full(n, float(np.mean(dbh_std)))
    elif freeze_variable is not None:
        raise ValueError(f"Unknown freeze_variable: {freeze_variable!r}")

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

    # MATERIAL/SPECIES MIX (Track v4-5): one material-class draw per Monte
    # Carlo draw, then a processor-fit multiplier specific to THAT class --
    # an "unresolved"/"natural_hardwood_mixed" draw does NOT get eucalyptus
    # veneer recovery just because the grading thresholds happen to be
    # eucalyptus-shaped. CFR-specific rng (its own species mix is local to
    # the stand, not a national or regional regime).
    material_class_indices = sample_material_class_indices(rng, n, material_mix_probs)
    material_fit = material_fit_multiplier(material_class_indices, material_mix_probs)
    if freeze_variable == "species_processor_fit":
        material_fit = np.full(n, float(np.mean(material_fit)))

    zurkt_suitable_volume_m3 = available_volume_m3 * merchantable_share * material_fit

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

    # SYSTEMIC fuel-price regime (Track v3-3): the SAME position in the fuel
    # price range for every CFR in this world, not an independent per-CFR
    # draw -- fuel prices move together nationally.
    fuel_price = _price("N_FUEL_L", global_draws.fuel_price_lambda)

    vol_safe = np.maximum(zurkt_suitable_volume_m3, 1e-6)
    q_f = _QTY["felling"]["chainsaw"]
    stems_per_crew_day = q_f["stems_per_crew_day"][1] - v_fell * (q_f["stems_per_crew_day"][1] - q_f["stems_per_crew_day"][0])
    crew_days_fell = np.ceil(np.maximum(stems_available, 1.0) / np.maximum(stems_per_crew_day, 1e-6))
    fell_cost = crew_days_fell * (_wage("L_CHAINSAW_OPERATOR", lam_wage) + _wage("L_CHAINSAW_ASSIST", lam_wage) + 0.5 * allowance)

    q_e = _QTY["extraction"]["tractor"]
    op_days_extr = np.ceil(available_area_ha * (q_e["machine_op_days_per_ha"][0] + v_extr * (q_e["machine_op_days_per_ha"][1] - q_e["machine_op_days_per_ha"][0])))
    fuel_extr_l = vol_safe * (q_e["fuel_L_per_m3"][0] + v_extr * (q_e["fuel_L_per_m3"][1] - q_e["fuel_L_per_m3"][0]))
    extr_cost = op_days_extr * (_wage("L_MACHINE_OPERATOR", lam_wage) + _price("N_RENT_TRACTOR", lam_price)) + fuel_extr_l * fuel_price

    payload_m3 = max(float(payload_direct_m3), 1e-9)
    trips = np.ceil(vol_safe / payload_m3)
    q_l = _QTY["loading"]["machine"]
    op_days_load = trips * (q_l["machine_op_days_per_trip"][0] + v_load * (q_l["machine_op_days_per_trip"][1] - q_l["machine_op_days_per_trip"][0]))
    fuel_load_l = trips * (q_l["fuel_L_per_trip"][0] + v_load * (q_l["fuel_L_per_trip"][1] - q_l["fuel_L_per_trip"][0]))
    load_cost = op_days_load * (_wage("L_MACHINE_OPERATOR", lam_wage) + _price("N_RENT_LOADER", lam_price)) + fuel_load_l * fuel_price

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
    # Dwell time (loading queue/unloading at the mill) -- fixed per trip,
    # NOT distance-dependent, same range this repo's own
    # roundwood_production.add_haulage_costs() uses.
    dwell_days_per_trip = q_h["machine_op_days_per_trip"][0] + v_haul * (q_h["machine_op_days_per_trip"][1] - q_h["machine_op_days_per_trip"][0])
    # Driving time: an explicit round-trip distance/speed term, ASSUMED
    # (no real Uganda feeder-road speed survey exists for this catchment) at
    # a broad, conservative average truck speed accounting for a mix of
    # murram/tarmac rural roads. This is the fix for the documented v1
    # limitation that delivered cost was only weakly distance-sensitive --
    # roundwood_production.py's own add_haulage_costs() has the same gap
    # (op_days_per_trip is a fixed range there too), but Zurkt/Evergreen's
    # catchment spans a much wider distance range (a few km to 150km) where
    # ignoring driving time materially understates cost for the farthest
    # CFRs and flattens the delivered-cost curve into a near step function.
    # SYSTEMIC truck-speed regime: shared across every CFR (a road-quality/
    # fleet-speed regime plausibly affects the whole catchment together, not
    # independently CFR-by-CFR) -- this also means the delivered-cost
    # curve's overall SLOPE moves together across worlds, which is more
    # realistic than each CFR getting its own independent speed luck.
    avg_truck_speed_kmph = global_draws.avg_truck_speed_kmph
    driving_days_per_trip = (2.0 * haul_km) / np.maximum(avg_truck_speed_kmph, 1.0) / HOURS_PER_WORKDAY
    op_days_haul = trips * (dwell_days_per_trip + driving_days_per_trip)
    fuel_haul_l = (trips * haul_km) * (q_h["fuel_L_per_km"][0] + v_haul * (q_h["fuel_L_per_km"][1] - q_h["fuel_L_per_km"][0]))
    haul_cost = op_days_haul * (_wage("L_MACHINE_OPERATOR", lam_wage) + _price("N_RENT_TRUCK", lam_price)) + fuel_haul_l * fuel_price
    haul_cost_per_m3 = haul_cost / vol_safe

    # Regulatory/admin (Track 9: kept small & separate, never folded
    # silently into harvest or haulage).
    q_r = _QTY["regulatory"]
    permit_cost_per_ha = _price("N_NFA_PERMIT", lam_price) / max(q_r["permit_ha_covered"][0], 1.0)
    reg_admin_cost_per_m3 = (available_area_ha * permit_cost_per_ha) / vol_safe

    # Standing-timber/procurement cost (Track 9): what is paid for the
    # standing wood itself, BEFORE any harvest/extraction/haulage/regulatory
    # activity cost -- an explicit separate line, never blended into the
    # activity-cost lines above. SYSTEMIC (Track v3-3): one shared national
    # stumpage-price regime per world, not an independent per-CFR draw --
    # standing-timber prices are set by policy/market, not CFR-by-CFR luck.
    procurement_cost_per_m3 = global_draws.stumpage_price_usd_per_m3

    # NOTE: _wage()/_price() draw from roundwood_production.py's
    # retail_labour_categories()/retail_nonlab_items(), which are already
    # USD-denominated (money_columns_to_usd() is applied inside those
    # functions) -- every activity-cost term above is already in USD. Do not
    # divide by UGX_PER_USD again here (an earlier version of this module
    # did, silently shrinking every delivered-cost figure ~3700x).
    delivered_cost_usd_per_m3 = procurement_cost_per_m3 + hel_cost_per_m3 + haul_cost_per_m3 + reg_admin_cost_per_m3

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
        procurement_cost_usd_per_m3=quantiles(procurement_cost_per_m3),
        harvest_extract_load_cost_usd_per_m3=quantiles(hel_cost_per_m3),
        haulage_cost_usd_per_m3=quantiles(haul_cost_per_m3),
        regulatory_admin_cost_usd_per_m3=quantiles(reg_admin_cost_per_m3),
        delivered_cost_usd_per_m3=quantiles(delivered_cost_usd_per_m3),
        annual_suitable_supply_m3=quantiles(annual_suitable_supply_m3),
        material_class_probabilities=(
            {c: round(float(np.mean(material_class_indices == i)), 4) for i, c in enumerate((material_mix_probs or DEFAULT_MATERIAL_MIX_PROBS).keys())}
        ),
        material_class_evidence="external_evidence" if material_mix_probs is not None else "broad_prior",
    ), {
        "region_id": region_id,
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
