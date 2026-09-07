"""Provider-neutral EO domain DTOs (EO observation architecture section 8).

No ``ee.Image``/``ee.Geometry`` or any other provider execution object may
appear here, in canonical rows, or in API contracts -- only the adapter
module (``ee_provider.py``) imports ``ee``. This module defines what a
provider must return, in plain typed values.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Protocol

Outcome = Literal["success", "partial", "no_observation", "failed"]


@dataclass(frozen=True)
class ExactGeometry:
    """A pinned AOI version's geometry, identified by hash -- never raw
    provider geometry objects."""

    aoi_version_id: str
    geometry_hash: str
    geojson: dict
    area_m2: float


@dataclass(frozen=True)
class SourceItem:
    provider_key: str
    collection_key: str
    item_id: str
    sensing_start: datetime
    sensing_end: datetime | None
    platform: str | None
    processing_baseline: str | None
    properties: dict
    role: str = "signal"
    included: bool = True
    exclusion_reason: str | None = None


@dataclass(frozen=True)
class DiscoveryManifest:
    provider_key: str
    collection_key: str
    window_start: datetime
    window_end: datetime
    candidate_count: int
    items: tuple[SourceItem, ...]

    @property
    def included_items(self) -> tuple[SourceItem, ...]:
        return tuple(item for item in self.items if item.included)


@dataclass(frozen=True)
class FeatureStat:
    feature_key: str
    feature_version: str
    value_statistic: str
    value: float | None
    unit: str
    variance: float | None
    standard_deviation: float | None
    valid_pixel_count: int | None
    total_pixel_count: int | None
    effective_area_m2: float | None
    source_coverage_fraction: float | None
    usable_fraction: float | None
    missingness: str | None = None
    reason_codes: tuple[str, ...] = ()


@dataclass(frozen=True)
class ExtractionResult:
    outcome: Outcome
    reason_codes: tuple[str, ...]
    applied_qa_profile: str
    source_coverage_fraction: float | None
    clear_pixel_fraction: float | None
    usable_observation_fraction: float | None
    acquisition_count: int
    eligible_acquisition_count: int
    features: tuple[FeatureStat, ...]
    grid: dict
    used_items: tuple[SourceItem, ...] = ()
    # Per-cell acquisition support (task Part 4): the minimum distinct-
    # acquisition threshold applied, and the AOI-area-weighted fraction of
    # target cells that actually met it. An AOI-wide acquisition count never
    # implies every cell had that much support -- this is the per-cell signal.
    min_acquisition_support: int = 2
    eligible_support_area_fraction: float | None = None


class EOProvider(Protocol):
    """``ee_provider.EarthEngineProvider`` and ``fake_provider.FakeEOProvider``
    both implement this. Discovery/extraction operate on registered,
    allowlisted collections/recipes only -- never an arbitrary user expression.
    """

    def discover(
        self,
        geometry: ExactGeometry,
        collection_key: str,
        window_start: datetime,
        window_end: datetime,
    ) -> DiscoveryManifest: ...

    def extract(
        self,
        geometry: ExactGeometry,
        manifest: DiscoveryManifest,
        recipe_key: str,
        recipe_version: str,
        qa_profile_key: str,
        qa_profile_version: str,
    ) -> ExtractionResult: ...


class ProviderError(Exception):
    def __init__(self, reason_code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.reason_code = reason_code
        self.message = message
        self.retryable = retryable
