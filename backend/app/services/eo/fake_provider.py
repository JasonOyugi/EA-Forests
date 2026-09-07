"""Deterministic in-process EO provider for algorithmic tests (EO observation
architecture PR4: "worker CLI with a fake provider"). No network, no ``ee``
import. Scripted per test via ``FakeEOProvider(items=..., pixels=...)``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from app.services.eo.feature_registry import CORE_FEATURES
from app.services.eo.provider import (
    DiscoveryManifest,
    ExactGeometry,
    ExtractionResult,
    FeatureStat,
    SourceItem,
)


@dataclass
class FakeEOProvider:
    """``items``: SourceItems to return from discover(); ``feature_values``:
    ``{feature_key: (mean, variance)}`` used to synthesize extract() output,
    or ``outcome`` to force a non-success scientific outcome, or
    ``raise_error`` to simulate a provider failure.
    """

    items: tuple[SourceItem, ...] = ()
    feature_values: dict[str, tuple[float, float]] = field(default_factory=dict)
    outcome: str = "success"
    usable_observation_fraction: float = 0.9
    total_pixel_count: int = 100
    valid_pixel_count: int | None = None
    eligible_support_area_fraction: float | None = None
    raise_error: Exception | None = None
    discover_calls: list[tuple] = field(default_factory=list)
    extract_calls: list[tuple] = field(default_factory=list)

    def discover(
        self,
        geometry: ExactGeometry,
        collection_key: str,
        window_start: datetime,
        window_end: datetime,
    ) -> DiscoveryManifest:
        self.discover_calls.append((geometry.aoi_version_id, collection_key, window_start, window_end))
        return DiscoveryManifest(
            provider_key="fake",
            collection_key=collection_key,
            window_start=window_start,
            window_end=window_end,
            candidate_count=len(self.items),
            items=self.items,
        )

    def extract(
        self,
        geometry: ExactGeometry,
        manifest: DiscoveryManifest,
        recipe_key: str,
        recipe_version: str,
        qa_profile_key: str,
        qa_profile_version: str,
    ) -> ExtractionResult:
        self.extract_calls.append((geometry.aoi_version_id, recipe_key, qa_profile_key))
        if self.raise_error:
            raise self.raise_error
        if not manifest.included_items:
            return ExtractionResult(
                outcome="no_observation",
                reason_codes=("NO_ACQUISITIONS",),
                applied_qa_profile=qa_profile_key,
                source_coverage_fraction=0.0,
                clear_pixel_fraction=None,
                usable_observation_fraction=None,
                acquisition_count=0,
                eligible_acquisition_count=0,
                features=(),
                grid={"crs": "EPSG:32636", "resolution_m": 20, "grid_version": "cfr-eo-grid/0.1"},
                used_items=(),
            )
        valid = self.valid_pixel_count if self.valid_pixel_count is not None else int(
            self.total_pixel_count * self.usable_observation_fraction
        )
        features = []
        if self.outcome == "success":
            for definition in CORE_FEATURES:
                mean, variance = self.feature_values.get(definition.key, (0.5, 0.01))
                features.append(
                    FeatureStat(
                        feature_key=definition.key,
                        feature_version=definition.version,
                        value_statistic="mean",
                        value=mean,
                        unit=definition.unit,
                        variance=variance,
                        standard_deviation=variance**0.5,
                        valid_pixel_count=valid,
                        total_pixel_count=self.total_pixel_count,
                        effective_area_m2=valid * 400.0,
                        source_coverage_fraction=1.0,
                        usable_fraction=self.usable_observation_fraction,
                    )
                )
        return ExtractionResult(
            outcome=self.outcome,
            reason_codes=() if self.outcome == "success" else ("NO_ACQUISITIONS",),
            applied_qa_profile=qa_profile_key,
            source_coverage_fraction=1.0 if manifest.included_items else 0.0,
            clear_pixel_fraction=self.usable_observation_fraction if manifest.included_items else None,
            usable_observation_fraction=self.usable_observation_fraction
            if self.outcome == "success"
            else None,
            acquisition_count=len(manifest.items),
            eligible_acquisition_count=len(manifest.included_items),
            features=tuple(features),
            grid={"crs": "EPSG:32636", "resolution_m": 20, "grid_version": "cfr-eo-grid/0.1"},
            used_items=manifest.included_items,
            min_acquisition_support=2,
            eligible_support_area_fraction=(
                self.eligible_support_area_fraction
                if self.eligible_support_area_fraction is not None
                else (self.usable_observation_fraction if self.outcome == "success" else None)
            ),
        )
