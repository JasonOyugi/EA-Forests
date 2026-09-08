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
from app.services.eo.reliability import PROVIDER_DEADLINE_MS
from app.services.site_classification import ensure_earth_engine_initialized

PROVIDER_KEY = "google_earth_engine"
COLLECTION_KEY = "COPERNICUS/S2_SR_HARMONIZED"
QA_PROFILE_CORE = "s2-qa-scl-core/1"
QA_PROFILE_ENHANCED = "s2-qa-scl-enhanced/1"  # registered; execution deferred (task section 10)
MAX_PIXELS = int(1e8)
# Pilot eligibility policy (EO observation architecture section on observation
# eligibility): a comparison candidate needs at least 2 distinct contributing
# acquisitions per eligible target cell. Not revised here for lack of
# evidence; see country-pass Part 2 report for the investigation that
# confirmed this is unrelated to the statistics fix.
MIN_SUPPORT_ACQUISITIONS = 2


_deadline_applied = False


def _ensure_provider_deadline() -> None:
    """Sets a real, transport-level deadline on every subsequent Earth Engine
    API call (verified live against ee-oyugijason: a tightened deadline here
    surfaces as a builtin ``TimeoutError`` from the actual HTTP read, not a
    Python-level wrapper racing an uncontrolled request -- see
    reliability.py's module docstring). Applied once per process; global
    process state, same as ``ee.Initialize()`` itself.
    """
    global _deadline_applied
    if _deadline_applied:
        return
    ee.data.setDeadline(PROVIDER_DEADLINE_MS)
    _deadline_applied = True


def _getinfo(obj):
    """Like ``site_classification.safe_getinfo``, but preserves enough of the
    original exception to classify a real provider timeout (``TimeoutError``,
    raised by ee's own transport when ``_ensure_provider_deadline`` 's limit
    is hit) as distinctly retryable from any other provider failure, instead
    of collapsing every exception into one generic message.
    """
    try:
        return obj.getInfo()
    except TimeoutError as exc:
        raise ProviderError(
            "PROVIDER_TIMEOUT",
            f"Earth Engine request exceeded the {PROVIDER_DEADLINE_MS}ms provider deadline: {exc}",
            retryable=True,
        ) from exc
    except Exception as exc:
        raise ProviderError("PROVIDER_UNAVAILABLE", f"Earth Engine request failed: {exc}", retryable=True) from exc


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
        _ensure_provider_deadline()
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

        raw = _getinfo(ee.FeatureCollection(collection.map(to_feature)))

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
        _ensure_provider_deadline()
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

        support_raw = _getinfo(ee.FeatureCollection(prepared.map(acquisition_support)))

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

        # Per-cell acquisition support: how many DISTINCT prepared acquisitions
        # contributed an unmasked pixel here (never an AOI-wide scene count
        # standing in for per-cell support -- task Part 4). A pixel is
        # "eligible" only where the pilot policy's minimum (2) is met.
        support_count = prepared.map(lambda img: ee.Image(img).select("B4").mask()).sum().rename("support")
        eligible_mask = support_count.gte(MIN_SUPPORT_ACQUISITIONS).rename("eligible")

        # Explicit area-weighted sufficient statistics (task Parts 2/3): every
        # quantity below is reduced with the SAME default *weighted* sum()
        # reducer in one reduceRegion call, which empirically applies EE's
        # native AOI-boundary coverage-fraction weighting (verified live:
        # scripts/investigate_reduceregion_weighting.py) -- i.e. exactly
        # w_i = area(AOI intersect cell_i). This replaces the previous
        # mean()/variance()/count() combo, whose count() used a binary
        # "pixel touched" rule that overcounts boundary pixels relative to
        # true area (16 vs a true ~9 in the verification script) and was the
        # source of both the >1 coverage-fraction bug and the small-AOI
        # sample()-vs-reduceRegion() disagreement in the pilot: count() was
        # never the right denominator. Only sum() is used below; count() is
        # not used for any scientific quantity.
        # A single (non-combined) reducer's reduceRegion output key is just
        # the band name, with NO reducer-name suffix; that suffix only
        # appears for combined multi-statistic reducers (e.g.
        # mean().combine(variance())). Assuming a "_sum" suffix here produced
        # an all-None/all-zero result live twice before this was verified
        # with a minimal repro -- see docs/data-provenance/
        # uganda-eo-country-pass-report.md.
        sum_bands = [ee.Image.constant(1).rename("total_weight"), eligible_mask.rename("eligible_weight")]
        for definition in CORE_FEATURES:
            key = definition.key
            band = {"ndvi": ndvi, "ndmi": ndmi, "nbr": nbr}[key]
            sum_bands.append(band.rename(f"{key}_x"))
            sum_bands.append(band.pow(2).rename(f"{key}_x2"))
            sum_bands.append(band.mask().rename(f"{key}_w"))
        stats_image = ee.Image.cat(sum_bands)

        stats = _getinfo(
            stats_image.reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=aoi,
                crs=crs,
                scale=grid.resolution_m,
                maxPixels=MAX_PIXELS,
            )
        )

        total_weight = stats.get("total_weight")
        eligible_weight = stats.get("eligible_weight")

        def _fraction(numerator, denominator):
            # Defensive clamp: weighted sums are theoretically bounded by
            # denominator already; clamping only guards float rounding, it
            # never substitutes for the explicit weighted computation above.
            if numerator is None or not denominator:
                return None
            return max(0.0, min(1.0, numerator / denominator))

        features = []
        min_valid_weight = None
        for definition in CORE_FEATURES:
            key = definition.key
            sum_w = stats.get(f"{key}_w")
            sum_x = stats.get(f"{key}_x")
            sum_x2 = stats.get(f"{key}_x2")
            mean = (sum_x / sum_w) if sum_w else None
            variance = (sum_x2 / sum_w - mean**2) if sum_w and mean is not None else None
            variance = max(variance, 0.0) if variance is not None else None  # guard tiny negative float noise
            if sum_w is not None:
                min_valid_weight = sum_w if min_valid_weight is None else min(min_valid_weight, sum_w)
            features.append(
                FeatureStat(
                    feature_key=key,
                    feature_version=definition.version,
                    value_statistic="mean",
                    value=mean,
                    unit=definition.unit,
                    variance=variance,
                    standard_deviation=variance**0.5 if variance is not None else None,
                    valid_pixel_count=round(sum_w) if sum_w is not None else 0,
                    total_pixel_count=round(total_weight) if total_weight else 0,
                    effective_area_m2=(sum_w or 0) * (grid.resolution_m**2),
                    source_coverage_fraction=_fraction(sum_w, total_weight),
                    usable_fraction=_fraction(sum_w, total_weight),
                    missingness=None if sum_w else "NOT_MEASURED",
                )
            )

        usable_fraction = _fraction(min_valid_weight, total_weight) or 0.0
        eligible_support_area_fraction = _fraction(eligible_weight, total_weight)
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
            min_acquisition_support=MIN_SUPPORT_ACQUISITIONS,
            eligible_support_area_fraction=eligible_support_area_fraction,
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
