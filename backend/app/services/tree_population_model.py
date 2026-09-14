"""Latent tree-population inference (Track v7, EA Forests Asset Intelligence
v3). Real, traceable priors + a forward observation model + an importance-
sampling (ABC-style) posterior, replacing "tree population = not done" with
an actual, honestly-wide posterior for stems/ha, DBH, height, basal area and
standing volume, per structural stratum, aggregated to asset.

WHAT THIS IS: mu = sum_i delta_(x_i, species_i, DBH_i, H_i) is represented
through a small set of LATENT STAND VARIABLES (theta) per stratum:
  N            stems/ha
  dbh_k, dbh_lambda    Weibull(k, lambda) DBH distribution parameters (cm)
  hd_a, hd_b, hd_c     Chapman-Richards height-diameter parameters
  crown_alpha, crown_beta   crown-radius allometry (nuisance, for cover)
  chm_offset, gedi_offset   sensor-specific offsets between the latent
                            canopy-height-mixture and what CHMv2 / GEDI RH
                            actually report (see forward_simulate docstring)

No individual tree is instantiated as a permanent object; theta is sampled,
a finite synthetic population (a few hundred trees) is drawn PER DRAW purely
to compute expected observables, and discarded. This is importance sampling
/ approximate Bayesian computation (ABC): draw theta from the prior,
simulate what CHMv2/GEDI would show under theta, weight by closeness to the
REAL polygon-clipped CHMv2/GEDI evidence, and report the resulting weighted
posterior with an effective sample size (ESS) -- not a full MCMC sampler,
which the sprint's instructions explicitly allow as a first implementation.

PRIORS ARE TRACEABLE: every MATERIAL_PRIORS entry below carries a `sources`
list. Every number originates either from a real, cited regional/pantropical
forestry-science source (see sources), or is marked GENERIC_WIDE_PRIOR where
no East-Africa-specific parameterization could be found -- in which case the
prior is deliberately widened rather than borrowing a false precision. This
was compiled from a dedicated research pass in this sprint; sources include
Ogana et al. (Weibull DBH fitting for plantation eucalyptus), Alder (1979,
East African conifer plantation growth model), the FRP 1989-93 Uganda P.
caribaea inventory, Lewis et al. (2013, African tropical forest structure),
and Chave et al. (2014, pantropical AGB allometry) -- see each entry.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

import numpy as np

CM_PER_M = 100.0


@dataclass(frozen=True)
class Prior1D:
    """A single scalar prior: family + parameters + traceable source."""

    family: str  # "lognormal" | "normal" | "uniform" | "truncnormal"
    params: dict[str, float]
    source: str
    confidence: str  # "REGIONAL_LITERATURE" | "PANTROPICAL_TRANSFER" | "GENERIC_WIDE_PRIOR"

    def sample(self, rng: np.random.Generator, n: int) -> np.ndarray:
        if self.family == "lognormal":
            return rng.lognormal(self.params["mu"], self.params["sigma"], size=n)
        if self.family == "normal":
            return rng.normal(self.params["mean"], self.params["sd"], size=n)
        if self.family == "truncnormal":
            x = rng.normal(self.params["mean"], self.params["sd"], size=n)
            return np.clip(x, self.params.get("lo", -np.inf), self.params.get("hi", np.inf))
        if self.family == "uniform":
            return rng.uniform(self.params["lo"], self.params["hi"], size=n)
        raise ValueError(f"unknown prior family {self.family}")


@dataclass(frozen=True)
class MaterialPriorSet:
    material_class: str
    stems_per_ha: Prior1D
    dbh_weibull_k: Prior1D
    dbh_scale_ratio: Prior1D  # dbh_lambda = dbh_scale_ratio * height_hint_cm_proxy (ties scale to real CHM height signal)
    hd_a: Prior1D  # asymptotic height above 1.37m (Chapman-Richards)
    hd_b: Prior1D
    hd_c: Prior1D
    crown_alpha: Prior1D
    crown_beta: Prior1D
    form_factor: Prior1D  # volume = form_factor * (pi/4) * DBH_m^2 * H_m
    wood_density_g_cm3: Prior1D
    sources: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# MATERIAL PRIORS -- traceable, per material class. Every number sourced or
# explicitly flagged GENERIC_WIDE_PRIOR (see module docstring / sprint report
# for the underlying research pass).
# ---------------------------------------------------------------------------

_EUC_SOURCES = [
    "Planting density ~1,100-2,000 stems/ha at establishment: Eucalyptus planting guidance, Uganda/Kenya on-farm "
    "extension material (eucaecoconsults.com; Kenya Forest Service Eucalyptus Guidelines). REGIONAL_LITERATURE, "
    "wide uncertainty applied for unknown current stocking/thinning history.",
    "Weibull as the standard DBH-distribution family for even-aged plantation eucalyptus: Ogana et al., "
    "'Characterization of Diameter Distribution and Prediction of Weibull Parameters Equation for "
    "Plantation-grown Eucalyptus Species' (2021); Ogana et al., Can. J. For. Res. (2021), 3-P Weibull "
    "outperformed normal. REGIONAL_LITERATURE for the FAMILY choice; shape/scale magnitude is GENERIC_WIDE_PRIOR "
    "(no East-Africa-specific parameter set found).",
    "Chapman-Richards H-D form is the conventional structural form for plantation species; no East-Africa-"
    "specific parameter set found -- GENERIC_WIDE_PRIOR.",
    "Volume via form-factor x basal area x height (physically-grounded, not a fitted regional equation) -- "
    "form factor centred ~0.45-0.50 is a widely-cited average for fast-growing tropical hardwood; GENERIC_WIDE_PRIOR.",
]

_PINE_SOURCES = [
    "Alder (1979), 'A Distance-Independent Tree Model for Exotic Conifer Plantations in East Africa', Forest "
    "Science 25(1):59-71 -- calibrated on permanent sample plots across Kenya/Tanzania/Uganda/Malawi, valid "
    "initial stocking range 120-1,400 stems/ha, volume prediction residual SD 12-19%. REGIONAL_LITERATURE, the "
    "strongest regional citation found for any species in this model.",
    "Uganda Forestry Rehabilitation Project 1989-93 P. caribaea inventory (868 plots): site top height ~23.4m "
    "at age 20, total volume ~726 m3/ha near peak MAI at age 30. REGIONAL_LITERATURE, used to bound the H-D "
    "asymptote and plausible standing volume ceiling.",
    "Weibull DBH family: generic transfer from the same even-aged-plantation rationale as eucalyptus; "
    "GENERIC_WIDE_PRIOR for shape/scale magnitude.",
]

_NATURAL_SOURCES = [
    "Lewis et al. (2013), 'Above-ground biomass and structure of 260 African tropical forests', Phil. Trans. "
    "R. Soc. B (PMC3720018): stems/ha (>=10cm DBH) ~460-507/ha, basal area ~30.2-33.8 m2/ha. PANTROPICAL_TRANSFER "
    "-- this is pan-African, not Uganda-CFR-specific or Mbooni-specific, so uncertainty is deliberately widened.",
    "Chave et al. (2014), 'Improved allometric models to estimate the aboveground biomass of tropical trees', "
    "Global Change Biology 20(10):3177-3190: AGB = 0.0673*(rho*D^2*H)^0.976. Used only for the independent "
    "GEDI L4A AGBD cross-check (see build_posterior_predictive_checks), not the primary volume calculation. "
    "PANTROPICAL_TRANSFER.",
    "DBH distribution family (Weibull/negative-exponential) for uneven-aged natural stands is conventional; no "
    "Uganda-specific shape/scale found -- GENERIC_WIDE_PRIOR, shape favouring a reverse-J-like (many small stems) "
    "population typical of natural mixed forest.",
]

_DEGRADED_SOURCES = [
    "No regional citation located for degraded/open woody vegetation stocking in these specific CFRs/parcels -- "
    "GENERIC_WIDE_PRIOR throughout, deliberately low-density, high-relative-uncertainty.",
]


MATERIAL_PRIORS: dict[str, MaterialPriorSet] = {
    "eucalyptus_plantation": MaterialPriorSet(
        material_class="eucalyptus_plantation",
        stems_per_ha=Prior1D("lognormal", {"mu": math.log(900), "sigma": 0.5}, "planting density thinned toward maturity, see sources", "REGIONAL_LITERATURE"),
        dbh_weibull_k=Prior1D("truncnormal", {"mean": 2.6, "sd": 0.8, "lo": 1.2, "hi": 6.0}, "even-aged plantation -> fairly regular (higher k) DBH distribution", "GENERIC_WIDE_PRIOR"),
        dbh_scale_ratio=Prior1D("truncnormal", {"mean": 0.9, "sd": 0.35, "lo": 0.2, "hi": 2.5}, "DBH scale (cm) as a multiple of CHM-height-derived age/size proxy", "GENERIC_WIDE_PRIOR"),
        hd_a=Prior1D("truncnormal", {"mean": 28.0, "sd": 8.0, "lo": 8.0, "hi": 45.0}, "asymptotic height above 1.37m, eucalyptus plantation", "GENERIC_WIDE_PRIOR"),
        hd_b=Prior1D("truncnormal", {"mean": 0.08, "sd": 0.03, "lo": 0.02, "hi": 0.2}, "Chapman-Richards rate parameter", "GENERIC_WIDE_PRIOR"),
        hd_c=Prior1D("truncnormal", {"mean": 1.4, "sd": 0.5, "lo": 0.6, "hi": 3.0}, "Chapman-Richards shape parameter", "GENERIC_WIDE_PRIOR"),
        crown_alpha=Prior1D("truncnormal", {"mean": 0.28, "sd": 0.08, "lo": 0.1, "hi": 0.6}, "generic crown-radius allometry alpha (cr_m = alpha*dbh_cm^beta)", "GENERIC_WIDE_PRIOR"),
        crown_beta=Prior1D("truncnormal", {"mean": 0.5, "sd": 0.1, "lo": 0.2, "hi": 0.9}, "generic crown-radius allometry beta", "GENERIC_WIDE_PRIOR"),
        form_factor=Prior1D("truncnormal", {"mean": 0.47, "sd": 0.07, "lo": 0.25, "hi": 0.7}, "commonly cited average stem form factor, fast-growing tropical hardwood", "GENERIC_WIDE_PRIOR"),
        wood_density_g_cm3=Prior1D("truncnormal", {"mean": 0.55, "sd": 0.08, "lo": 0.35, "hi": 0.75}, "typical green plantation eucalyptus wood density", "GENERIC_WIDE_PRIOR"),
        sources=_EUC_SOURCES,
    ),
    "pine_plantation": MaterialPriorSet(
        material_class="pine_plantation",
        stems_per_ha=Prior1D("lognormal", {"mu": math.log(500), "sigma": 0.55}, "Alder (1979) valid stocking range 120-1400 stems/ha", "REGIONAL_LITERATURE"),
        dbh_weibull_k=Prior1D("truncnormal", {"mean": 2.4, "sd": 0.8, "lo": 1.2, "hi": 5.5}, "even-aged conifer plantation", "GENERIC_WIDE_PRIOR"),
        dbh_scale_ratio=Prior1D("truncnormal", {"mean": 0.85, "sd": 0.35, "lo": 0.2, "hi": 2.5}, "DBH scale vs CHM-height proxy", "GENERIC_WIDE_PRIOR"),
        hd_a=Prior1D("truncnormal", {"mean": 26.0, "sd": 7.0, "lo": 8.0, "hi": 40.0}, "P. caribaea/P. patula asymptote near FRP 1989-93 top height ~23.4m at age 20", "REGIONAL_LITERATURE"),
        hd_b=Prior1D("truncnormal", {"mean": 0.07, "sd": 0.03, "lo": 0.02, "hi": 0.18}, "Chapman-Richards rate parameter", "GENERIC_WIDE_PRIOR"),
        hd_c=Prior1D("truncnormal", {"mean": 1.5, "sd": 0.5, "lo": 0.6, "hi": 3.0}, "Chapman-Richards shape parameter", "GENERIC_WIDE_PRIOR"),
        crown_alpha=Prior1D("truncnormal", {"mean": 0.22, "sd": 0.07, "lo": 0.08, "hi": 0.5}, "narrower conifer crown vs eucalyptus", "GENERIC_WIDE_PRIOR"),
        crown_beta=Prior1D("truncnormal", {"mean": 0.5, "sd": 0.1, "lo": 0.2, "hi": 0.9}, "generic crown-radius allometry beta", "GENERIC_WIDE_PRIOR"),
        form_factor=Prior1D("truncnormal", {"mean": 0.48, "sd": 0.07, "lo": 0.25, "hi": 0.7}, "conifer stem form factor, generic", "GENERIC_WIDE_PRIOR"),
        wood_density_g_cm3=Prior1D("truncnormal", {"mean": 0.42, "sd": 0.06, "lo": 0.3, "hi": 0.6}, "typical green plantation pine wood density", "GENERIC_WIDE_PRIOR"),
        sources=_PINE_SOURCES,
    ),
    "mixed_plantation": MaterialPriorSet(
        material_class="mixed_plantation",
        stems_per_ha=Prior1D("lognormal", {"mu": math.log(700), "sigma": 0.55}, "blend of eucalyptus/pine plantation priors", "GENERIC_WIDE_PRIOR"),
        dbh_weibull_k=Prior1D("truncnormal", {"mean": 2.3, "sd": 0.8, "lo": 1.1, "hi": 5.0}, "blended plantation regularity", "GENERIC_WIDE_PRIOR"),
        dbh_scale_ratio=Prior1D("truncnormal", {"mean": 0.87, "sd": 0.4, "lo": 0.2, "hi": 2.5}, "DBH scale vs CHM-height proxy", "GENERIC_WIDE_PRIOR"),
        hd_a=Prior1D("truncnormal", {"mean": 27.0, "sd": 8.0, "lo": 8.0, "hi": 42.0}, "blended plantation asymptote", "GENERIC_WIDE_PRIOR"),
        hd_b=Prior1D("truncnormal", {"mean": 0.075, "sd": 0.03, "lo": 0.02, "hi": 0.19}, "Chapman-Richards rate parameter", "GENERIC_WIDE_PRIOR"),
        hd_c=Prior1D("truncnormal", {"mean": 1.45, "sd": 0.5, "lo": 0.6, "hi": 3.0}, "Chapman-Richards shape parameter", "GENERIC_WIDE_PRIOR"),
        crown_alpha=Prior1D("truncnormal", {"mean": 0.25, "sd": 0.08, "lo": 0.1, "hi": 0.55}, "blended crown allometry", "GENERIC_WIDE_PRIOR"),
        crown_beta=Prior1D("truncnormal", {"mean": 0.5, "sd": 0.1, "lo": 0.2, "hi": 0.9}, "generic crown-radius allometry beta", "GENERIC_WIDE_PRIOR"),
        form_factor=Prior1D("truncnormal", {"mean": 0.47, "sd": 0.07, "lo": 0.25, "hi": 0.7}, "blended stem form factor", "GENERIC_WIDE_PRIOR"),
        wood_density_g_cm3=Prior1D("truncnormal", {"mean": 0.48, "sd": 0.08, "lo": 0.32, "hi": 0.7}, "blended wood density", "GENERIC_WIDE_PRIOR"),
        sources=["Blend of eucalyptus_plantation and pine_plantation priors; no independent regional source for a mixed-species plantation stand."],
    ),
    "natural_hardwood_mixed": MaterialPriorSet(
        material_class="natural_hardwood_mixed",
        stems_per_ha=Prior1D("lognormal", {"mu": math.log(480), "sigma": 0.6}, ">=10cm DBH stems/ha, Lewis et al. 2013 pan-African mean ~460-507/ha", "PANTROPICAL_TRANSFER"),
        dbh_weibull_k=Prior1D("truncnormal", {"mean": 1.3, "sd": 0.4, "lo": 0.7, "hi": 3.0}, "reverse-J-like uneven-aged natural stand DBH distribution", "GENERIC_WIDE_PRIOR"),
        dbh_scale_ratio=Prior1D("truncnormal", {"mean": 1.1, "sd": 0.5, "lo": 0.2, "hi": 3.0}, "DBH scale vs CHM-height proxy, wider for heterogeneous natural stand", "GENERIC_WIDE_PRIOR"),
        hd_a=Prior1D("truncnormal", {"mean": 30.0, "sd": 10.0, "lo": 8.0, "hi": 50.0}, "natural mixed forest asymptotic height, wide", "GENERIC_WIDE_PRIOR"),
        hd_b=Prior1D("truncnormal", {"mean": 0.06, "sd": 0.03, "lo": 0.015, "hi": 0.16}, "Chapman-Richards rate parameter", "GENERIC_WIDE_PRIOR"),
        hd_c=Prior1D("truncnormal", {"mean": 1.3, "sd": 0.5, "lo": 0.5, "hi": 3.0}, "Chapman-Richards shape parameter", "GENERIC_WIDE_PRIOR"),
        crown_alpha=Prior1D("truncnormal", {"mean": 0.32, "sd": 0.1, "lo": 0.12, "hi": 0.65}, "broader natural-tree crowns", "GENERIC_WIDE_PRIOR"),
        crown_beta=Prior1D("truncnormal", {"mean": 0.52, "sd": 0.12, "lo": 0.2, "hi": 0.95}, "generic crown-radius allometry beta", "GENERIC_WIDE_PRIOR"),
        form_factor=Prior1D("truncnormal", {"mean": 0.5, "sd": 0.09, "lo": 0.25, "hi": 0.75}, "generic natural-forest stem form factor", "GENERIC_WIDE_PRIOR"),
        wood_density_g_cm3=Prior1D("truncnormal", {"mean": 0.58, "sd": 0.12, "lo": 0.3, "hi": 0.9}, "typical mixed tropical hardwood wood density, wide", "PANTROPICAL_TRANSFER"),
        sources=_NATURAL_SOURCES,
    ),
    "degraded_open": MaterialPriorSet(
        material_class="degraded_open",
        stems_per_ha=Prior1D("lognormal", {"mu": math.log(120), "sigma": 0.8}, "low-density degraded/open woody vegetation, wide", "GENERIC_WIDE_PRIOR"),
        dbh_weibull_k=Prior1D("truncnormal", {"mean": 1.5, "sd": 0.6, "lo": 0.7, "hi": 4.0}, "generic open/degraded DBH shape", "GENERIC_WIDE_PRIOR"),
        dbh_scale_ratio=Prior1D("truncnormal", {"mean": 0.6, "sd": 0.4, "lo": 0.1, "hi": 2.0}, "small stems typical of degraded/regrowth vegetation", "GENERIC_WIDE_PRIOR"),
        hd_a=Prior1D("truncnormal", {"mean": 14.0, "sd": 6.0, "lo": 3.0, "hi": 30.0}, "low canopy asymptote, degraded/open", "GENERIC_WIDE_PRIOR"),
        hd_b=Prior1D("truncnormal", {"mean": 0.1, "sd": 0.05, "lo": 0.02, "hi": 0.25}, "Chapman-Richards rate parameter", "GENERIC_WIDE_PRIOR"),
        hd_c=Prior1D("truncnormal", {"mean": 1.2, "sd": 0.5, "lo": 0.5, "hi": 3.0}, "Chapman-Richards shape parameter", "GENERIC_WIDE_PRIOR"),
        crown_alpha=Prior1D("truncnormal", {"mean": 0.3, "sd": 0.1, "lo": 0.1, "hi": 0.6}, "generic crown allometry, degraded", "GENERIC_WIDE_PRIOR"),
        crown_beta=Prior1D("truncnormal", {"mean": 0.5, "sd": 0.12, "lo": 0.2, "hi": 0.9}, "generic crown-radius allometry beta", "GENERIC_WIDE_PRIOR"),
        form_factor=Prior1D("truncnormal", {"mean": 0.45, "sd": 0.1, "lo": 0.2, "hi": 0.75}, "generic form factor, degraded/scrubby stems", "GENERIC_WIDE_PRIOR"),
        wood_density_g_cm3=Prior1D("truncnormal", {"mean": 0.55, "sd": 0.12, "lo": 0.3, "hi": 0.85}, "generic wood density, unknown species mix", "GENERIC_WIDE_PRIOR"),
        sources=_DEGRADED_SOURCES,
    ),
    "unresolved": MaterialPriorSet(
        material_class="unresolved",
        stems_per_ha=Prior1D("lognormal", {"mu": math.log(350), "sigma": 1.0}, "maximally wide, unresolved material class", "GENERIC_WIDE_PRIOR"),
        dbh_weibull_k=Prior1D("truncnormal", {"mean": 1.8, "sd": 0.9, "lo": 0.6, "hi": 5.0}, "maximally wide", "GENERIC_WIDE_PRIOR"),
        dbh_scale_ratio=Prior1D("truncnormal", {"mean": 0.85, "sd": 0.55, "lo": 0.1, "hi": 3.0}, "maximally wide", "GENERIC_WIDE_PRIOR"),
        hd_a=Prior1D("truncnormal", {"mean": 22.0, "sd": 12.0, "lo": 3.0, "hi": 50.0}, "maximally wide", "GENERIC_WIDE_PRIOR"),
        hd_b=Prior1D("truncnormal", {"mean": 0.08, "sd": 0.05, "lo": 0.015, "hi": 0.25}, "maximally wide", "GENERIC_WIDE_PRIOR"),
        hd_c=Prior1D("truncnormal", {"mean": 1.4, "sd": 0.7, "lo": 0.5, "hi": 3.0}, "maximally wide", "GENERIC_WIDE_PRIOR"),
        crown_alpha=Prior1D("truncnormal", {"mean": 0.28, "sd": 0.12, "lo": 0.08, "hi": 0.65}, "maximally wide", "GENERIC_WIDE_PRIOR"),
        crown_beta=Prior1D("truncnormal", {"mean": 0.5, "sd": 0.15, "lo": 0.2, "hi": 0.95}, "maximally wide", "GENERIC_WIDE_PRIOR"),
        form_factor=Prior1D("truncnormal", {"mean": 0.47, "sd": 0.12, "lo": 0.2, "hi": 0.75}, "maximally wide", "GENERIC_WIDE_PRIOR"),
        wood_density_g_cm3=Prior1D("truncnormal", {"mean": 0.52, "sd": 0.15, "lo": 0.25, "hi": 0.9}, "maximally wide", "GENERIC_WIDE_PRIOR"),
        sources=["No material-class evidence at all for this stratum; every prior is deliberately maximally wide."],
    ),
}

CHM_OFFSET_PRIOR = Prior1D("normal", {"mean": -1.0, "sd": 1.2}, "CHMv2 vs latent canopy-height-mixture systematic offset (CHM often under-reads top height)", "GENERIC_WIDE_PRIOR")
GEDI_OFFSET_PRIOR = Prior1D("normal", {"mean": 0.0, "sd": 2.5}, "GEDI RH (waveform energy percentile) vs latent canopy-height-mixture offset -- NOT the same physical quantity as CHM surface height", "GENERIC_WIDE_PRIOR")

# Physically-motivated upper bounds on stems/ha (real silviculture: even very
# young, dense eucalyptus coppice self-thins well before these levels;
# natural moist forest stem counts >=10cm DBH rarely approach plantation
# density). These cap the PRIOR's extreme tail; they are not a fitted or
# site-measured value, and are documented as a plausibility bound, not a
# precise limit.
MAX_STEMS_PER_HA: dict[str, float] = {
    "eucalyptus_plantation": 3000.0,
    "pine_plantation": 2200.0,
    "mixed_plantation": 2600.0,
    "natural_hardwood_mixed": 1500.0,
    "degraded_open": 900.0,
    "unresolved": 2500.0,
}

# Basal-area plausibility regularizer (soft penalty in the ABC likelihood,
# not a hard prior clip): dense tropical/plantation stands are very rarely
# observed above ~55-65 m^2/ha in the regional literature reviewed for this
# sprint (Lewis et al. 2013 reports ~30-34 m^2/ha typical for natural
# African moist forest; managed plantations can run higher but rarely beyond
# ~55-60 m^2/ha even at very high stocking). Draws with basal area beyond
# this are down-weighted rather than forbidden, since the CHM/GEDI
# likelihood alone under-constrains the (N, DBH) product once canopy cover
# saturates near 1 -- documented explicitly rather than left as a silent
# artefact of prior-tail draws surviving unweighted.
BASAL_AREA_PLAUSIBILITY_CENTER_M2_HA = 55.0
BASAL_AREA_PLAUSIBILITY_WIDTH_M2_HA = 15.0


def _deterministic_seed(key: str, base_seed: int = 0) -> int:
    import hashlib

    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return (base_seed + int(digest[:8], 16)) % (2**31 - 1)


@dataclass
class ForwardSimResult:
    chm_percentiles: dict[str, np.ndarray]  # {"p50":..., "p75":..., ...} each shape (n_draws,)
    gedi_percentiles: dict[str, np.ndarray]
    cover: np.ndarray  # (n_draws,)
    mean_dbh_cm: np.ndarray
    mean_height_m: np.ndarray
    basal_area_m2_ha: np.ndarray
    standing_volume_m3_ha: np.ndarray


PERCENTILE_LEVELS = [50, 75, 90, 95, 98]


def sample_theta(priors: MaterialPriorSet, n_draws: int, chm_height_hint_m: float, rng: np.random.Generator) -> dict[str, np.ndarray]:
    """Draw theta from the material class's priors. dbh_lambda (Weibull
    scale, cm) is tied to the REAL observed CHM height signal for this
    stratum via dbh_scale_ratio -- taller observed canopy => a wider DBH
    scale prior, not because CHM measures DBH, but because a real, taller
    canopy signal makes very small stems implausible as the dominant
    population. This is the one place where real EO evidence informs the
    PRIOR itself (still corrected by the likelihood afterwards)."""
    height_hint_cm = max(1.0, chm_height_hint_m) * CM_PER_M / 10.0  # a soft, bounded size proxy, not a literal unit conversion
    n_cap = MAX_STEMS_PER_HA.get(priors.material_class, 3000.0)
    theta = {
        "N": np.clip(priors.stems_per_ha.sample(rng, n_draws), 5.0, n_cap),
        "dbh_k": priors.dbh_weibull_k.sample(rng, n_draws),
        "dbh_lambda": np.clip(priors.dbh_scale_ratio.sample(rng, n_draws) * height_hint_cm, 3.0, 150.0),
        "hd_a": priors.hd_a.sample(rng, n_draws),
        "hd_b": priors.hd_b.sample(rng, n_draws),
        "hd_c": priors.hd_c.sample(rng, n_draws),
        "crown_alpha": priors.crown_alpha.sample(rng, n_draws),
        "crown_beta": priors.crown_beta.sample(rng, n_draws),
        "form_factor": priors.form_factor.sample(rng, n_draws),
        "wood_density": priors.wood_density_g_cm3.sample(rng, n_draws),
        "chm_offset": CHM_OFFSET_PRIOR.sample(rng, n_draws),
        "gedi_offset": GEDI_OFFSET_PRIOR.sample(rng, n_draws),
    }
    return theta


def forward_simulate(theta: dict[str, np.ndarray], rng: np.random.Generator, n_trees: int = 220, n_mixture_pixels: int = 200) -> ForwardSimResult:
    """The bridge between a latent stand state theta and what CHMv2/GEDI
    would be expected to show. For each draw: sample a synthetic DBH
    population from Weibull(k, lambda), derive height via Chapman-Richards,
    derive crown area via a generic crown-radius allometry, and combine into
    a Poisson-canopy cover fraction (cover = 1 - exp(-N * mean_crown_area /
    10000), the standard ecological relationship between stem density, mean
    crown area and canopy cover). A per-draw pixel-height MIXTURE population
    is then built: with probability = cover, a "pixel" lands under a tree
    canopy (drawn crown-area-weighted, since bigger crowns cover more
    pixels); otherwise it lands in a gap (near-ground height). Percentiles
    of that mixture, shifted by a small sensor-specific offset, are the
    model's PREDICTED CHMv2 / GEDI RH percentiles -- this is what lets a
    single latent tree-population explain two different sensors without
    pretending they measure the same physical quantity."""
    n_draws = len(theta["N"])
    dbh = theta["dbh_lambda"][:, None] * rng.weibull(theta["dbh_k"][:, None], size=(n_draws, n_trees))
    dbh = np.clip(dbh, 0.5, 250.0)
    height = 1.37 + theta["hd_a"][:, None] * (1 - np.exp(-theta["hd_b"][:, None] * dbh)) ** theta["hd_c"][:, None]
    height = np.clip(height + rng.normal(0, 0.8, size=height.shape), 1.37, 70.0)

    crown_r = theta["crown_alpha"][:, None] * np.power(dbh, theta["crown_beta"][:, None])
    crown_area = np.pi * crown_r**2  # m^2
    mean_crown_area = crown_area.mean(axis=1)
    cover = 1.0 - np.exp(-theta["N"] * mean_crown_area / 10_000.0)
    cover = np.clip(cover, 0.001, 0.995)

    mixture = np.empty((n_draws, n_mixture_pixels))
    for i in range(n_draws):
        weights = crown_area[i] / crown_area[i].sum()
        is_canopy = rng.random(n_mixture_pixels) < cover[i]
        n_canopy = int(is_canopy.sum())
        if n_canopy > 0:
            tree_idx = rng.choice(n_trees, size=n_canopy, p=weights)
            mixture[i, is_canopy] = height[i, tree_idx]
        mixture[i, ~is_canopy] = rng.uniform(0.0, 1.5, size=int((~is_canopy).sum()))

    chm_pct = {}
    gedi_pct = {}
    for q in PERCENTILE_LEVELS:
        raw = np.percentile(mixture, q, axis=1)
        chm_pct[f"p{q}"] = np.clip(raw + theta["chm_offset"], 0.0, None)
        gedi_pct[f"p{q}"] = np.clip(raw + theta["gedi_offset"], 0.0, None)

    ba_m2_ha = theta["N"] * (np.pi / 4.0) * (dbh.mean(axis=1) / 100.0) ** 2
    vol_m3_ha = theta["N"] * theta["form_factor"] * (np.pi / 4.0) * ((dbh / 100.0) ** 2 * height).mean(axis=1)

    return ForwardSimResult(
        chm_percentiles=chm_pct,
        gedi_percentiles=gedi_pct,
        cover=cover,
        mean_dbh_cm=dbh.mean(axis=1),
        mean_height_m=height.mean(axis=1),
        basal_area_m2_ha=ba_m2_ha,
        standing_volume_m3_ha=vol_m3_ha,
    )


@dataclass
class StratumEvidence:
    chm_percentiles_m: dict[str, float]  # real, from asset_structural_evidence_v3 (p50,p75,p90,p95,p98)
    gedi_percentiles_m: dict[str, float] | None  # real, matched-shot pooled means, or None if no shots in stratum
    gedi_cover_mean: float | None
    n_gedi_shots: int


def _weighted_quantiles(values: np.ndarray, weights: np.ndarray, qs: list[float]) -> dict[str, float]:
    order = np.argsort(values)
    v = values[order]
    w = weights[order]
    cw = np.cumsum(w)
    cw = cw / cw[-1]
    out = {}
    for q in qs:
        idx = int(np.searchsorted(cw, q))
        idx = min(idx, len(v) - 1)
        out[f"p{int(q * 100)}"] = float(v[idx])
    return out


def run_stratum_inference(
    material_class: str,
    evidence: StratumEvidence,
    chm_height_hint_m: float,
    seed_key: str,
    n_draws: int = 12000,
) -> dict[str, Any]:
    """Importance-sampling / ABC posterior for ONE (stratum, material class)
    combination. Returns weighted posterior quantiles for N, DBH (mean +
    Weibull params), height, basal area, standing volume, plus ESS and an
    approximate log-evidence (mean log-weight) usable as a crude marginal-
    likelihood proxy for material-class selection."""
    rng = np.random.default_rng(_deterministic_seed(seed_key, 9001))
    priors = MATERIAL_PRIORS[material_class]
    theta = sample_theta(priors, n_draws, chm_height_hint_m, rng)
    sim = forward_simulate(theta, rng)

    # Distance / Gaussian-kernel log-weight. Scales chosen as a fraction of
    # typical canopy-height variation (~2-4m) -- documented as a modelling
    # choice, not a fitted value (no calibration dataset exists to fit it to).
    chm_scale_m = 2.5
    gedi_scale_m = 4.0
    cover_scale = 0.2

    # Percentile terms within one sensor are highly correlated (they all
    # derive from the same per-draw mixture population), so they are
    # averaged into ONE curve-distance term per sensor rather than summed as
    # if they were independent measurements -- summing them as independent
    # was tested and produced a badly degenerate importance sample (ESS well
    # under 1% of n_draws), which is a real statistical over-peaking
    # artefact of double-counting correlated information, not a genuine
    # reflection of how informative the evidence is.
    log_w = np.zeros(n_draws)
    chm_sq_terms = []
    for q in PERCENTILE_LEVELS:
        key = f"p{q}"
        obs = evidence.chm_percentiles_m.get(key)
        if obs is None:
            continue
        chm_sq_terms.append(((sim.chm_percentiles[key] - obs) / chm_scale_m) ** 2)
    n_chm_terms = len(chm_sq_terms)
    if chm_sq_terms:
        log_w += -0.5 * np.mean(chm_sq_terms, axis=0)

    gedi_sq_terms = []
    if evidence.gedi_percentiles_m:
        for q in PERCENTILE_LEVELS:
            key = f"p{q}"
            obs = evidence.gedi_percentiles_m.get(key)
            if obs is None:
                continue
            gedi_sq_terms.append(((sim.gedi_percentiles[key] - obs) / gedi_scale_m) ** 2)
    n_gedi_terms = len(gedi_sq_terms)
    if gedi_sq_terms:
        log_w += -0.5 * np.mean(gedi_sq_terms, axis=0)
    if evidence.gedi_cover_mean is not None:
        log_w += -0.5 * ((sim.cover - evidence.gedi_cover_mean) / cover_scale) ** 2

    # Basal-area plausibility regularizer (see BASAL_AREA_PLAUSIBILITY_* docstring):
    # a one-sided soft penalty only above the plausible center, so it never
    # pulls a well-constrained low-BA posterior around, only discourages the
    # otherwise-unconstrained extreme tail of (high N x large DBH) draws.
    ba_excess = np.clip(sim.basal_area_m2_ha - BASAL_AREA_PLAUSIBILITY_CENTER_M2_HA, 0.0, None)
    log_w += -0.5 * (ba_excess / BASAL_AREA_PLAUSIBILITY_WIDTH_M2_HA) ** 2

    log_w -= log_w.max()  # numerical stability
    w = np.exp(log_w)
    w_sum = w.sum()
    if w_sum <= 0 or not np.isfinite(w_sum):
        w = np.ones(n_draws)
        w_sum = float(n_draws)
    ess = float((w.sum() ** 2) / (w**2).sum())
    mean_log_weight = float(np.log(w_sum / n_draws)) if w_sum > 0 else float("-inf")

    qs = [0.1, 0.25, 0.5, 0.75, 0.9]
    n_post = _weighted_quantiles(theta["N"], w, qs)
    dbh_post = _weighted_quantiles(sim.mean_dbh_cm, w, qs)
    h_post = _weighted_quantiles(sim.mean_height_m, w, qs)
    ba_post = _weighted_quantiles(sim.basal_area_m2_ha, w, qs)
    vol_post = _weighted_quantiles(sim.standing_volume_m3_ha, w, qs)
    dbh_k_post = _weighted_quantiles(theta["dbh_k"], w, qs)
    dbh_lambda_post = _weighted_quantiles(theta["dbh_lambda"], w, qs)

    # DBH histogram: draw a representative posterior DBH sample by resampling
    # trees proportional to draw-weight, for a real (not fabricated-smooth) histogram.
    resample_idx = rng.choice(n_draws, size=min(4000, n_draws * 4), replace=True, p=w / w.sum())
    dbh_hist_lambda = theta["dbh_lambda"][resample_idx]
    dbh_hist_k = theta["dbh_k"][resample_idx]
    dbh_samples = dbh_hist_lambda * rng.weibull(dbh_hist_k)
    hist_counts, hist_edges = np.histogram(dbh_samples, bins=20, range=(0, max(5.0, float(np.percentile(dbh_samples, 99)))))

    # Resampled per-ha posterior draws (not JSON-serialized -- key prefixed
    # "_" by the same convention used elsewhere in this sprint's scripts),
    # for the CALLER to combine across material classes within a stratum
    # (probability-weighted mixture) and across strata to an asset total
    # (independent Monte Carlo summation) WITHOUT multiplying independent
    # quantiles together.
    posterior_samples = {
        "stems_per_ha": theta["N"][resample_idx],
        "mean_height_m": sim.mean_height_m[resample_idx],
        "basal_area_m2_per_ha": sim.basal_area_m2_ha[resample_idx],
        "standing_volume_m3_per_ha": sim.standing_volume_m3_ha[resample_idx],
        "mean_dbh_cm": sim.mean_dbh_cm[resample_idx],
    }

    height_samples_mix = None  # populated by caller if needed for canopy-vs-tree height charts

    # Prior-only run (same draws, weight=1) for prior-vs-posterior shrinkage comparison.
    prior_n = _weighted_quantiles(theta["N"], np.ones(n_draws), qs)
    prior_dbh = _weighted_quantiles(sim.mean_dbh_cm, np.ones(n_draws), qs)
    prior_dominated = ess > 0.6 * n_draws  # weights barely differentiated draws -> evidence didn't move the posterior much

    return {
        "material_class": material_class,
        "n_draws": n_draws,
        "effective_sample_size": round(ess, 1),
        "ess_fraction": round(ess / n_draws, 3),
        "approx_mean_log_weight": round(mean_log_weight, 3),
        "n_chm_likelihood_terms": n_chm_terms,
        "n_gedi_likelihood_terms": n_gedi_terms,
        "prior_dominated": bool(prior_dominated),
        "identifiability": "PRIOR_DOMINATED" if prior_dominated else "EVIDENCE_CONSTRAINED",
        "stems_per_ha": {"prior": prior_n, "posterior": n_post},
        "dbh_cm": {"prior": prior_dbh, "posterior": dbh_post, "weibull_k_posterior": dbh_k_post, "weibull_lambda_posterior": dbh_lambda_post,
                   "histogram": {"counts": hist_counts.tolist(), "bin_edges_cm": [round(float(e), 2) for e in hist_edges]}},
        "height_m": {"posterior": h_post},
        "basal_area_m2_per_ha": {"posterior": ba_post},
        "standing_volume_m3_per_ha": {"posterior": vol_post},
        "posterior_predictive": {
            "chm_percentiles_predicted_m": {k: round(float(_weighted_quantiles(v, w, [0.5])["p50"]), 2) for k, v in sim.chm_percentiles.items()},
            "chm_percentiles_observed_m": evidence.chm_percentiles_m,
            "gedi_percentiles_predicted_m": {k: round(float(_weighted_quantiles(v, w, [0.5])["p50"]), 2) for k, v in sim.gedi_percentiles.items()} if evidence.gedi_percentiles_m else None,
            "gedi_percentiles_observed_m": evidence.gedi_percentiles_m,
            "cover_predicted": round(float(_weighted_quantiles(sim.cover, w, [0.5])["p50"]), 3),
            "cover_observed": evidence.gedi_cover_mean,
        },
        "sources": priors.sources,
        "_posterior_samples": posterior_samples,
    }
