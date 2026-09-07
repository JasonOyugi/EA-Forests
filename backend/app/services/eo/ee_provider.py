"""Earth Engine adapter (EO observation architecture section 9). Only this
module imports ``ee``; no ``ee.Image``/``ee.Geometry`` crosses into canonical
rows, API contracts, domain DTOs or inference code. Reuses the existing
shared EE runtime (init caching, project/network config) from
``site_classification`` rather than duplicating it.
"""

from __future__ import annotations

from datetime import UTC, datetime

import ee

from app.services.eo.feature_registry import CORE_FEATURES, REFLECTANCE_SCALE, SCL_REJECTED_CLASSES
from app.services.eo.provider import (
    DiscoveryManifest,
    ExactGeometry,
    ExtractionResult,
    FeatureStat,
    ProviderError,
    SourceItem,
)
from app.services.site_classification import ensure_earth_engine_initialized, safe_getinfo

PROVIDER_KEY = "google_earth_engine"
COLLECTION_KEY = "COPERNICUS/S2_SR_HARMONIZED"
QA_PROFILE_CORE = "s2-qa-scl-core/1"
QA_PROFILE_ENHANCED = "s2-qa-scl-enhanced/1"  # registered; execution deferred (task section 10)
MAX_PIXELS = int(1e8)


def _ee_datetime(millis) -> datetime | None:
    if millis is None:
        return None
    return datetime.fromtimestamp(int(millis) / 1000, tz=UTC)


def _ee_date(dt: datetime):
    return ee.Date(dt.astimezone(UTC).isoformat())


class EarthEngineProvider:
    """First real EO provider. Discovery and extraction operate only on the
    pinned ``COLLECTION_KEY`` under the ``s2-qa-scl-core/1`` profile.
    """

    def discover(
        self,
        geometry: ExactGeometry,
        collection_key: str,
        window_start: datetime,
        window_end: datetime,
    ) -> DiscoveryManifest:
        if collection_key != COLLECTION_KEY:
            raise ProviderError("UNSUPPORTED_COLLECTION", f"Only {COLLECTION_KEY} is registered")
        ensure_earth_engine_initialized()
        try:
            aoi = ee.Geometry(geometry.geojson)
            collection = (
                ee.ImageCollection(collection_key)
                .filterBounds(aoi)
                .filterDate(_ee_date(window_start), _ee_date(window_end))
            )

            def to_feature(image):
                image = ee.Image(image)
                return ee.Feature(
                    None,
                    {
                        "system_index": image.get("system:index"),
                        "sensing_start": image.get("system:time_start"),
                        "sensing_end": image.get("system:time_end"),
                        "platform": image.get("SPACECRAFT_NAME"),
                        "processing_baseline": image.get("PROCESSING_BASELINE"),
                        "cloudy_pixel_percentage": image.get("CLOUDY_PIXEL_PERCENTAGE"),
                        "mgrs_tile": image.get("MGRS_TILE"),
                    },
                )

            raw = safe_getinfo(ee.FeatureCollection(collection.map(to_feature)))
        except RuntimeError as exc:
            raise ProviderError("PROVIDER_UNAVAILABLE", str(exc), retryable=True) from exc

        items = []
        for feature in raw.get("features", []):
            properties = feature.get("properties", {})
            item_id = properties.get("system_index")
            if not item_id:
                continue
            items.append(
                SourceItem(
                    provider_key=PROVIDER_KEY,
                    collection_key=collection_key,
                    item_id=item_id,
                    sensing_start=_ee_datetime(properties.get("sensing_start")),
                    sensing_end=_ee_datetime(properties.get("sensing_end")),
                    platform=properties.get("platform"),
                    processing_baseline=(
                        str(properties["processing_baseline"])
                        if properties.get("processing_baseline") is not None
                        else None
                    ),
                    properties={
                        "cloudy_pixel_percentage": properties.get("cloudy_pixel_percentage"),
                        "mgrs_tile": properties.get("mgrs_tile"),
                    },
                    role="signal",
                    included=True,
                )
            )
        # Deterministic ordering: acquisition time, then item ID (architecture section 10, step 3).
        items.sort(key=lambda item: (item.sensing_start, item.item_id))
        return DiscoveryManifest(
            provider_key=PROVIDER_KEY,
            collection_key=collection_key,
            window_start=window_start,
            window_end=window_end,
            candidate_count=len(items),
            items=tuple(items),
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
        if qa_profile_key != QA_PROFILE_CORE:
            raise ProviderError(
                "ENHANCED_QA_UNAVAILABLE" if qa_profile_key == QA_PROFILE_ENHANCED else "UNKNOWN_QA_PROFILE",
                f"Only {QA_PROFILE_CORE} executes in this vertical slice",
            )
        ensure_earth_engine_initialized()
        used_items = manifest.included_items
        if not used_items:
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
                grid={},
                used_items=(),
            )

        from app.services.eo.grid import select_grid

        bounds = _geojson_bounds(geometry.geojson)
        grid = select_grid(bounds)
        aoi = ee.Geometry(geometry.geojson)
        crs = grid.crs

        item_ids = [item.item_id for item in used_items]
        collection = ee.ImageCollection(manifest.collection_key).filter(
            ee.Filter.inList("system:index", item_ids)
        )

        def prepare(image):
            image = ee.Image(image)
            scl = image.select("SCL")
            reject = ee.Image.constant(0)
            for code in SCL_REJECTED_CLASSES:
                reject = reject.Or(scl.eq(code))
            valid_mask = reject.Not()
            bands = image.select(["B4", "B8", "B11", "B12"]).multiply(REFLECTANCE_SCALE).updateMask(valid_mask)
            return bands.copyProperties(image, ["system:time_start", "system:index"])

        prepared = collection.map(prepare)

        # Per-acquisition valid pixel counts (one FeatureCollection getInfo call).
        def acquisition_support(image):
            image = ee.Image(image)
            count = (
                image.select("B4")
                .reduceRegion(
                    reducer=ee.Reducer.count(),
                    geometry=aoi,
                    crs=crs,
                    scale=grid.resolution_m,
                    maxPixels=MAX_PIXELS,
                )
                .get("B4")
            )
            return ee.Feature(None, {"system_index": image.get("system:index"), "valid_count": count})

        try:
            support_raw = safe_getinfo(ee.FeatureCollection(prepared.map(acquisition_support)))
        except RuntimeError as exc:
            raise ProviderError("PROVIDER_UNAVAILABLE", str(exc), retryable=True) from exc

        eligible_ids = {
            f["properties"]["system_index"]
            for f in support_raw.get("features", [])
            if (f["properties"].get("valid_count") or 0) > 0
        }
        eligible_acquisition_count = len(eligible_ids)
        acquisition_count = len(used_items)

        if eligible_acquisition_count == 0:
            return ExtractionResult(
                outcome="no_observation",
                reason_codes=("ALL_MASKED",),
                applied_qa_profile=qa_profile_key,
                source_coverage_fraction=0.0,
                clear_pixel_fraction=0.0,
                usable_observation_fraction=None,
                acquisition_count=acquisition_count,
                eligible_acquisition_count=0,
                features=(),
                grid={"crs": crs, "resolution_m": grid.resolution_m, "grid_version": grid.grid_version},
                used_items=used_items,
            )

        composite = prepared.median()
        b8 = composite.select("B8")
        ndvi = b8.subtract(composite.select("B4")).divide(b8.add(composite.select("B4"))).rename("ndvi")
        ndmi = b8.subtract(composite.select("B11")).divide(b8.add(composite.select("B11"))).rename("ndmi")
        nbr = b8.subtract(composite.select("B12")).divide(b8.add(composite.select("B12"))).rename("nbr")
        # An always-valid "total" band is added to the SAME image so its pixel
        # count is rasterized in the SAME reduceRegion call as the masked
        # feature bands. Two independent reduceRegion calls (even with
        # identical crs/scale/geometry) can disagree by a handful of boundary
        # pixels -- observed live during the pilot as usable_fraction > 1 --
        # so total and valid counts must come from one call, not two.
        total_band = ee.Image.constant(1).rename("total_pixels")
        feature_image = ndvi.addBands(ndmi).addBands(nbr).addBands(total_band)

        stats_reducer = (
            ee.Reducer.mean()
            .combine(ee.Reducer.variance(), sharedInputs=True)
            .combine(ee.Reducer.count(), sharedInputs=True)
        )
        try:
            stats = safe_getinfo(
                feature_image.reduceRegion(
                    reducer=stats_reducer,
                    geometry=aoi,
                    crs=crs,
                    scale=grid.resolution_m,
                    maxPixels=MAX_PIXELS,
                )
            )
        except RuntimeError as exc:
            raise ProviderError("PROVIDER_UNAVAILABLE", str(exc), retryable=True) from exc
        total_pixels = stats.get("total_pixels_count")

        features = []
        def _fraction(numerator, denominator):
            # Defensive clamp: reduceRegion pixel counts are integers from the
            # provider, so this should already be <= 1; clamping only guards
            # against floating-point edge cases, it never hides a real defect
            # (the single-call total/valid rasterization above is the actual fix).
            if numerator is None or not denominator:
                return None
            return max(0.0, min(1.0, numerator / denominator))

        min_valid = None
        for definition in CORE_FEATURES:
            key = definition.key
            valid_count = stats.get(f"{key}_count")
            mean = stats.get(f"{key}_mean")
            variance = stats.get(f"{key}_variance")
            if valid_count is not None:
                min_valid = valid_count if min_valid is None else min(min_valid, valid_count)
            features.append(
                FeatureStat(
                    feature_key=key,
                    feature_version=definition.version,
                    value_statistic="mean",
                    value=mean,
                    unit=definition.unit,
                    variance=variance,
                    standard_deviation=variance**0.5 if variance is not None else None,
                    valid_pixel_count=int(valid_count) if valid_count is not None else 0,
                    total_pixel_count=int(total_pixels) if total_pixels else 0,
                    effective_area_m2=(valid_count or 0) * (grid.resolution_m**2),
                    source_coverage_fraction=_fraction(valid_count, total_pixels),
                    usable_fraction=_fraction(valid_count, total_pixels),
                    missingness=None if valid_count else "NOT_MEASURED",
                )
            )

        usable_fraction = _fraction(min_valid, total_pixels) or 0.0
        outcome = "success" if usable_fraction and usable_fraction > 0 else "partial"
        return ExtractionResult(
            outcome=outcome,
            reason_codes=() if outcome == "success" else ("PARTIAL_COVERAGE",),
            applied_qa_profile=qa_profile_key,
            source_coverage_fraction=usable_fraction,
            clear_pixel_fraction=usable_fraction,
            usable_observation_fraction=usable_fraction,
            acquisition_count=acquisition_count,
            eligible_acquisition_count=eligible_acquisition_count,
            features=tuple(features),
            grid={"crs": crs, "resolution_m": grid.resolution_m, "grid_version": grid.grid_version},
            used_items=used_items,
        )


def _geojson_bounds(geojson: dict) -> dict:
    coords = []

    def walk(node):
        if isinstance(node, (int, float)):
            return
        if len(node) == 2 and all(isinstance(v, (int, float)) for v in node):
            coords.append(node)
            return
        for child in node:
            walk(child)

    walk(geojson.get("coordinates", []))
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return {"minx": min(xs), "miny": min(ys), "maxx": max(xs), "maxy": max(ys)}
