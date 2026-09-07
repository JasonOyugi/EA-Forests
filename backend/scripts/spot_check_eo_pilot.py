"""Independent spot-check: pull raw per-pixel NDVI values for one pilot
observation via ee.Image.sampleRegions (not reduceRegion) and recompute the
area-weighted mean/variance with app.services.eo.stats, then compare against
the persisted reduceRegion-derived result (EO observation architecture
section 21 sanity check).
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import ee
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import schema as s
from app.db.session import engine_for
from app.services.eo.feature_registry import REFLECTANCE_SCALE, SCL_REJECTED_CLASSES
from app.services.eo.pipeline import load_exact_geometry
from app.services.eo.stats import weighted_mean, weighted_population_variance
from app.services.site_classification import (
    ensure_earth_engine_initialized,
    safe_getinfo,
)

AOI_VERSION_ID = "550b0019-4dab-4228-bc55-a2350f1fc2b6"  # Mala Island, pilot small case
EO_OBSERVATION_ID = "9d6433ba-bb14-408d-9846-5742d9d0ba9c"


def main():
    engine = engine_for(os.environ["CANONICAL_DATABASE_URL"])
    with Session(engine) as db:
        geometry, _world_id, _bounds = load_exact_geometry(db, AOI_VERSION_ID)
        observation = (
            db.execute(select(s.eo_observation).where(s.eo_observation.c.id == EO_OBSERVATION_ID))
            .mappings()
            .one()
        )
        run = (
            db.execute(select(s.processing_run).where(s.processing_run.c.id == observation["processing_run_id"]))
            .mappings()
            .one()
        )
        persisted_feature_set = (
            db.execute(select(s.eo_feature_set).where(s.eo_feature_set.c.eo_observation_id == EO_OBSERVATION_ID))
            .mappings()
            .one()
        )
        persisted_ndvi = (
            db.execute(
                select(s.eo_feature_value).where(
                    s.eo_feature_value.c.eo_feature_set_id == persisted_feature_set["id"],
                    s.eo_feature_value.c.feature_key == "ndvi",
                )
            )
            .mappings()
            .one()
        )
        item_ids = [
            row["item_id"]
            for row in db.execute(
                select(s.eo_source_item)
                .select_from(
                    s.processing_input.join(
                        s.eo_source_item, s.processing_input.c.eo_source_item_id == s.eo_source_item.c.id
                    )
                )
                .where(s.processing_input.c.processing_run_id == run["id"])
            ).mappings()
        ]

    grid_crs = observation["discovery_manifest"]["grid"]["crs"]
    scale = observation["discovery_manifest"]["grid"]["resolution_m"]

    ensure_earth_engine_initialized()
    aoi = ee.Geometry(geometry.geojson)
    collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filter(
        ee.Filter.inList("system:index", item_ids)
    )

    def prepare(image):
        image = ee.Image(image)
        scl = image.select("SCL")
        reject = ee.Image.constant(0)
        for code in SCL_REJECTED_CLASSES:
            reject = reject.Or(scl.eq(code))
        valid_mask = reject.Not()
        return image.select(["B4", "B8"]).multiply(REFLECTANCE_SCALE).updateMask(valid_mask)

    composite = collection.map(prepare).median()
    ndvi = composite.select("B8").subtract(composite.select("B4")).divide(
        composite.select("B8").add(composite.select("B4"))
    ).rename("ndvi")

    # Direct per-pixel pull (only feasible because this AOI is small: ~43 pixels).
    samples = safe_getinfo(
        ndvi.sample(region=aoi, scale=scale, projection=grid_crs, geometries=False)
    )
    values = [f["properties"]["ndvi"] for f in samples["features"] if f["properties"].get("ndvi") is not None]
    weights = [1.0] * len(values)  # equal-area pixels at a fixed grid: uniform weight
    independent_mean = weighted_mean(values, weights)
    independent_variance = weighted_population_variance(values, weights, independent_mean)

    print("Independent direct pixel pull:")
    print(f"  n_pixels = {len(values)}")
    print(f"  mean     = {independent_mean}")
    print(f"  variance = {independent_variance}")
    print("Persisted reduceRegion-derived result:")
    print(f"  n_pixels = {persisted_ndvi['valid_pixel_count']}")
    print(f"  mean     = {float(persisted_ndvi['value'])}")
    print(f"  variance = {float(persisted_ndvi['variance'])}")
    print(f"  mean difference     = {abs(independent_mean - float(persisted_ndvi['value']))}")
    print(f"  variance difference = {abs(independent_variance - float(persisted_ndvi['variance']))}")


if __name__ == "__main__":
    main()
