"""Provider-neutral Sentinel-1 C-band SAR feature definitions (Uganda S2
history v0.1 -> multi-sensor Track A2). Mirrors feature_registry.py's split
between "the registry owns formulas/band mapping/semantics, the adapter owns
the EE expression" -- but for backscatter, not optical indices.

VV/VH are DIRECT SENSOR OBSERVATION (calibrated backscatter, not a derived
index) -- they are registered as "features" here only because the existing
FeatureStat/eo_feature_value storage is the right place to persist an
area-weighted spatial mean + SD of ANY per-pixel quantity, optical or radar.
Do not read "feature" as "equivalent epistemic status to NDVI": NDVI is a
derived ratio: VV/VH are what the instrument measured.

Two recipes, not one, because ascending and descending passes are not a
runtime filter to apply later -- they are a different acquisition geometry
and must never be blended into one physical time series (explicit
instruction). A third (orbit-agnostic) recipe is deliberately NOT registered
here.
"""

from __future__ import annotations

from dataclasses import dataclass

RECIPE_KEY_ASCENDING = "s1-grd-backscatter-ascending-v1"
RECIPE_KEY_DESCENDING = "s1-grd-backscatter-descending-v1"
RECIPE_VERSION = "1"

ORBIT_PASS_BY_RECIPE = {
    RECIPE_KEY_ASCENDING: "ASCENDING",
    RECIPE_KEY_DESCENDING: "DESCENDING",
}


@dataclass(frozen=True)
class SarFeatureDefinition:
    key: str
    version: str
    band: str  # the exact COPERNICUS/S1_GRD band this reads, already delivered in dB by EE
    unit: str = "dB"
    domain_min: float = -50.0
    domain_max: float = 10.0


# Core set: VV and VH exactly as delivered (calibrated, terrain-UNcorrected
# sigma0 in dB, EE's standard S1_GRD product) -- not a ratio, not a composite.
CORE_FEATURES: tuple[SarFeatureDefinition, ...] = (
    SarFeatureDefinition("s1_vv", "1", "VV"),
    SarFeatureDefinition("s1_vh", "1", "VH"),
)
CORE_FEATURE_KEYS = tuple(f.key for f in CORE_FEATURES)

# Reserved, not computed by the MVP recipe (task Part: "ratios where
# meaningful" is a Track B physics-analysis question, not a national
# operational default): VH/VV ratio in dB (VH_db - VV_db, equivalent to
# 10*log10(VH_linear/VV_linear)), linear-power VV/VH, temporal variance.
RESERVED_FEATURES = ("s1_vh_vv_ratio_db", "s1_vv_linear", "s1_vh_linear")

QA_PROFILE_KEY = "s1-qa-grd-iw-core/1"
QA_PROFILE_VERSION = "1"
# GRD-IW quality gate: dual-pol (VV+VH both present), IW acquisition mode
# only (matches the resolution/geometry the rest of the pipeline assumes),
# and a single, explicit orbit pass per recipe (see module docstring). No
# speckle filtering is applied here -- speckle is not additive Gaussian
# noise and must not be smoothed away by a default QA step; any filtering
# is a Track B analysis choice made explicitly, never a hidden QA default.
REQUIRED_BANDS = ("VV", "VH")
REQUIRED_INSTRUMENT_MODE = "IW"
