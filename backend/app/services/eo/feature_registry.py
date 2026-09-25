"""Provider-neutral Sentinel-2 optical feature definitions (EO observation
architecture, optical feature assessment table). The feature registry owns
formulas/band mapping/semantics; the adapter owns the EE expression
implementation of the same formula.
"""

from __future__ import annotations

from dataclasses import dataclass

FEATURE_RECIPE_KEY = "s2-sr-optical-v1"
FEATURE_RECIPE_VERSION = "1"


@dataclass(frozen=True)
class FeatureDefinition:
    key: str
    version: str
    formula: str
    bands: tuple[str, ...]
    unit: str = "ratio"
    domain_min: float = -1.0
    domain_max: float = 1.0


# MVP core set only (task section 12): NDVI, NDMI, NBR. No EVI/NDRE/extra
# indices, no "forest health score", no classifier.
CORE_FEATURES: tuple[FeatureDefinition, ...] = (
    FeatureDefinition("ndvi", "1", "(B8-B4)/(B8+B4)", ("B8", "B4")),
    FeatureDefinition("ndmi", "1", "(B8-B11)/(B8+B11)", ("B8", "B11")),
    FeatureDefinition("nbr", "1", "(B8-B12)/(B8+B12)", ("B8", "B12")),
)
CORE_FEATURE_KEYS = tuple(f.key for f in CORE_FEATURES)

REFLECTANCE_SCALE = 0.0001  # COPERNICUS/S2_SR_HARMONIZED DN -> reflectance
SCL_REJECTED_CLASSES = (0, 1, 2, 3, 7, 8, 9, 10, 11)  # no_data, saturated, dark/shadow, cloud, cirrus, snow; SCL 2/7 conservative
