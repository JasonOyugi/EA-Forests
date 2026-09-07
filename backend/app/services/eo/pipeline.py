"""Orchestrates discover -> extract -> persist for one EO analysis request
(EO observation architecture section 10 pipeline). Persists deterministic
processing lineage (D16) and the immutable EO observation/feature result.
Provider-agnostic: takes any ``EOProvider``.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from sqlalchemy import func, select

from app.db import schema as s
from app.services.eo.feature_registry import FEATURE_RECIPE_KEY, FEATURE_RECIPE_VERSION
from app.services.eo.grid import select_grid
from app.services.eo.provider import DiscoveryManifest, ExactGeometry, ExtractionResult, SourceItem
from app.services.eo.request import EOAnalysisRequest
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.state.registry import audit_context, insert_row

STATISTICS_PROFILE = "moments-v1"
CONFIGURATION_SCHEMA_VERSION = "eo-pipeline/0.1"
_EO_MODULE_ROOT = Path(__file__).resolve().parent


def _code_hash() -> str:
    digest = hashlib.sha256()
    for path in sorted(_EO_MODULE_ROOT.glob("*.py")):
        digest.update(path.read_bytes())
    return digest.hexdigest()


def load_exact_geometry(session, aoi_version_id: str) -> tuple[ExactGeometry, str, dict]:
    """Returns the pinned geometry, the AOI version's world_id, and its bounds."""
    row = (
        session.execute(
            select(
                s.aoi_version.c.geometry_hash,
                s.aoi_version.c.area_m2,
                s.aoi_version.c.world_id,
                s.aoi_version.c.geometry_observation_id,
                s.aoi_version.c.bounds,
            ).where(s.aoi_version.c.id == aoi_version_id)
        )
        .mappings()
        .one()
    )
    geojson_text = session.scalar(
        select(func.ST_AsGeoJSON(s.geometry_observation.c.geometry)).where(
            s.geometry_observation.c.id == row["geometry_observation_id"]
        )
    )
    geometry = ExactGeometry(
        aoi_version_id=str(aoi_version_id),
        geometry_hash=row["geometry_hash"],
        geojson=json.loads(geojson_text),
        area_m2=float(row["area_m2"]),
    )
    return geometry, str(row["world_id"]), row["bounds"]


def build_analysis_request(
    session,
    *,
    aoi_version_id: str,
    window_start,
    window_end,
    provider_key: str,
    collection_key: str,
    recipe_key: str,
    recipe_version: str,
    qa_profile_key: str,
    qa_profile_version: str,
    statistics_profile: str,
) -> EOAnalysisRequest:
    """The single place that turns an AOI version + intent into a complete,
    deterministic request identity -- used both to enqueue a job and to
    reconstruct the same request when a worker picks it up.
    """
    geometry, world_id, bounds = load_exact_geometry(session, aoi_version_id)
    grid = select_grid(bounds)
    return EOAnalysisRequest(
        world_id=world_id,
        aoi_version_id=str(aoi_version_id),
        geometry_hash=geometry.geometry_hash,
        window_start=window_start,
        window_end=window_end,
        provider_key=provider_key,
        collection_key=collection_key,
        recipe_key=recipe_key,
        recipe_version=recipe_version,
        qa_profile_key=qa_profile_key,
        qa_profile_version=qa_profile_version,
        statistics_profile=statistics_profile,
        grid_crs=grid.crs,
        grid_resolution_m=grid.resolution_m,
        grid_version=grid.grid_version,
    )


def _register_processing_version(session, store):
    code_hash = _code_hash()
    existing = (
        session.execute(
            select(s.processing_version).where(
                s.processing_version.c.recipe_key == FEATURE_RECIPE_KEY,
                s.processing_version.c.recipe_version == FEATURE_RECIPE_VERSION,
                s.processing_version.c.code_hash == code_hash,
            )
        )
        .mappings()
        .first()
    )
    if existing:
        return dict(existing)
    import platform as _platform

    environment = {"python": _platform.python_version()}
    return insert_row(
        session,
        s.processing_version,
        recipe_key=FEATURE_RECIPE_KEY,
        recipe_version=FEATURE_RECIPE_VERSION,
        code_hash=code_hash,
        environment=environment,
        configuration_schema_version=CONFIGURATION_SCHEMA_VERSION,
    )


def _find_or_create_source_item(session, item: SourceItem):
    existing = (
        session.execute(
            select(s.eo_source_item).where(
                s.eo_source_item.c.provider_key == item.provider_key,
                s.eo_source_item.c.collection_key == item.collection_key,
                s.eo_source_item.c.item_id == item.item_id,
            )
        )
        .mappings()
        .first()
    )
    if existing:
        return dict(existing)
    return insert_row(
        session,
        s.eo_source_item,
        provider_key=item.provider_key,
        collection_key=item.collection_key,
        item_id=item.item_id,
        sensing_start=item.sensing_start,
        sensing_end=item.sensing_end,
        platform=item.platform,
        processing_baseline=item.processing_baseline,
        properties=item.properties,
    )


def run_analysis(session, provider, request: EOAnalysisRequest, store=None) -> dict:
    store = store or LocalArtifactStore()
    audit_context(session, "eo-pipeline", "Sentinel-2 vertical slice analysis run")

    geometry, world_id, _bounds = load_exact_geometry(session, request.aoi_version_id)
    if world_id != request.world_id:
        raise ValueError("AOI version world does not match the requested world")

    processing_version = _register_processing_version(session, store)
    run = insert_row(
        session,
        s.processing_run,
        processing_version_id=processing_version["id"],
        world_id=request.world_id,
        configuration={
            "aoi_version_id": request.aoi_version_id,
            "geometry_hash": request.geometry_hash,
            "window_start": request.window_start.isoformat(),
            "window_end": request.window_end.isoformat(),
            "provider_key": request.provider_key,
            "collection_key": request.collection_key,
            "recipe_key": request.recipe_key,
            "recipe_version": request.recipe_version,
            "qa_profile_key": request.qa_profile_key,
            "qa_profile_version": request.qa_profile_version,
            "statistics_profile": request.statistics_profile,
            "grid_crs": request.grid_crs,
            "grid_resolution_m": request.grid_resolution_m,
            "grid_version": request.grid_version,
        },
    )
    session.execute(
        s.processing_run.update()
        .where(s.processing_run.c.id == run["id"])
        .values(started_at=request.window_start)
    )
    insert_row(
        session,
        s.processing_input,
        processing_run_id=run["id"],
        input_kind="aoi_version",
        aoi_version_id=request.aoi_version_id,
        role="aoi",
    )

    manifest: DiscoveryManifest = provider.discover(
        geometry, request.collection_key, request.window_start, request.window_end
    )
    result: ExtractionResult = provider.extract(
        geometry,
        manifest,
        request.recipe_key,
        request.recipe_version,
        request.qa_profile_key,
        request.qa_profile_version,
    )

    source_item_rows = {}
    for item in result.used_items:
        row = _find_or_create_source_item(session, item)
        source_item_rows[item.item_id] = row
        insert_row(
            session,
            s.processing_input,
            processing_run_id=run["id"],
            input_kind="source_item",
            eo_source_item_id=row["id"],
            role="signal",
        )

    output_manifest_hash = hashlib.sha256(
        json.dumps(
            {
                "candidate_count": manifest.candidate_count,
                "used_item_ids": sorted(item.item_id for item in result.used_items),
                "outcome": result.outcome,
            },
            sort_keys=True,
        ).encode()
    ).hexdigest()
    from datetime import UTC, datetime

    completed_at = datetime.now(UTC)
    session.execute(
        s.processing_run.update()
        .where(s.processing_run.c.id == run["id"])
        .values(
            outcome=result.outcome,
            completed_at=completed_at,
            reason_codes=list(result.reason_codes),
            output_manifest_hash=output_manifest_hash,
        )
    )

    series_existing = (
        session.execute(
            select(s.eo_series).where(
                s.eo_series.c.aoi_version_id == request.aoi_version_id,
                s.eo_series.c.provider_key == request.provider_key,
                s.eo_series.c.collection_key == request.collection_key,
                s.eo_series.c.recipe_key == request.recipe_key,
                s.eo_series.c.recipe_version == request.recipe_version,
                s.eo_series.c.qa_profile_key == request.qa_profile_key,
                s.eo_series.c.qa_profile_version == request.qa_profile_version,
                s.eo_series.c.statistics_profile == request.statistics_profile,
            )
        )
        .mappings()
        .first()
    )
    series = (
        dict(series_existing)
        if series_existing
        else insert_row(
            session,
            s.eo_series,
            aoi_version_id=request.aoi_version_id,
            world_id=request.world_id,
            provider_key=request.provider_key,
            collection_key=request.collection_key,
            recipe_key=request.recipe_key,
            recipe_version=request.recipe_version,
            qa_profile_key=request.qa_profile_key,
            qa_profile_version=request.qa_profile_version,
            statistics_profile=request.statistics_profile,
        )
    )

    observation = insert_row(
        session,
        s.eo_observation,
        series_id=series["id"],
        world_id=request.world_id,
        processing_run_id=run["id"],
        window_start=request.window_start,
        window_end=request.window_end,
        support_kind="composite",
        outcome=result.outcome,
        reason_codes=list(result.reason_codes),
        source_coverage_fraction=result.source_coverage_fraction,
        clear_pixel_fraction=result.clear_pixel_fraction,
        usable_observation_fraction=result.usable_observation_fraction,
        acquisition_count=result.acquisition_count,
        eligible_acquisition_count=result.eligible_acquisition_count,
        applied_qa_profile=result.applied_qa_profile,
        discovery_manifest={
            "candidate_count": manifest.candidate_count,
            "items": [
                {
                    "item_id": item.item_id,
                    "sensing_start": item.sensing_start.isoformat() if item.sensing_start else None,
                    "included": item.included,
                    "exclusion_reason": item.exclusion_reason,
                }
                for item in manifest.items
            ],
            "grid": result.grid,
        },
    )

    feature_set = None
    if result.features:
        feature_set = insert_row(
            session,
            s.eo_feature_set,
            eo_observation_id=observation["id"],
            feature_recipe_key=FEATURE_RECIPE_KEY,
            feature_recipe_version=FEATURE_RECIPE_VERSION,
            statistics_profile=request.statistics_profile,
        )
        for feature in result.features:
            insert_row(
                session,
                s.eo_feature_value,
                eo_feature_set_id=feature_set["id"],
                feature_key=feature.feature_key,
                feature_version=feature.feature_version,
                value_statistic=feature.value_statistic,
                value=feature.value,
                unit=feature.unit,
                variance=feature.variance,
                standard_deviation=feature.standard_deviation,
                valid_pixel_count=feature.valid_pixel_count,
                total_pixel_count=feature.total_pixel_count,
                effective_area_m2=feature.effective_area_m2,
                source_coverage_fraction=feature.source_coverage_fraction,
                usable_fraction=feature.usable_fraction,
                missingness=feature.missingness,
                reason_codes=list(feature.reason_codes),
            )

    return {
        "processing_run_id": run["id"],
        "eo_series_id": series["id"],
        "eo_observation_id": observation["id"],
        "eo_feature_set_id": feature_set["id"] if feature_set else None,
        "outcome": result.outcome,
        "reason_codes": list(result.reason_codes),
        "acquisition_count": result.acquisition_count,
        "eligible_acquisition_count": result.eligible_acquisition_count,
        "usable_observation_fraction": result.usable_observation_fraction,
        "features": [
            {"feature_key": f.feature_key, "value": f.value, "standard_deviation": f.standard_deviation}
            for f in result.features
        ],
    }
