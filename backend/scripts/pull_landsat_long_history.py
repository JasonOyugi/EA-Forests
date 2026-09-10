"""Real Landsat long optical history (observatory v0.2, section 13) -- a
genuine multi-year NDVI record to give the ~1-year Sentinel-2 record real
historical context. Uses Landsat Collection 2 Level-2 Surface Reflectance
(USGS's current product) via Earth Engine -- same credential already in
use for S2/S1, no new access needed (unlike GEDI's LP DAAC blocker).

Landsat 5/7/8/9 are DIFFERENT missions/instruments with different band
definitions, QA schemes, and native resolution (30m vs. S2's 10-20m).
This script keeps them identified per-scene (platform, collection,
processing level) -- it does NOT concatenate them with Sentinel-2 values
as though from one continuous instrument. No harmonization is applied;
none is claimed.

Real QA_PIXEL cloud/shadow masking (bits 3 and 4, per USGS's documented
Collection 2 QA_PIXEL bit layout), real reflectance scaling
(DN * 0.0000275 - 0.2, USGS's documented C2 L2 SR scale/offset).
Aggregates to one real area-weighted NDVI mean per calendar year per CFR
(not monthly, to keep the EE call count bounded for a first real pass) --
a coarser cadence than the Sentinel-2 record, explicit about that
tradeoff, not a hidden downsampling.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import ee
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import engine_for
from app.services.eo.cohort import load_cohort
from app.services.site_classification import ensure_earth_engine_initialized

# Landsat Collection 2 Level-2 Surface Reflectance, current USGS product.
# Each mission is a distinct collection -- never merged into one before
# extraction, so platform identity is always recoverable per scene.
LANDSAT_COLLECTIONS = {
    "LANDSAT_5": "LANDSAT/LT05/C02/T1_L2",  # 1984-2012, included for years where it overlaps
    "LANDSAT_7": "LANDSAT/LE07/C02/T1_L2",  # 1999-present (SLC-off gaps after 2003)
    "LANDSAT_8": "LANDSAT/LC08/C02/T1_L2",  # 2013-present
    "LANDSAT_9": "LANDSAT/LC09/C02/T1_L2",  # 2021-present
}
RED_BAND = {"LANDSAT_5": "SR_B3", "LANDSAT_7": "SR_B3", "LANDSAT_8": "SR_B4", "LANDSAT_9": "SR_B4"}
NIR_BAND = {"LANDSAT_5": "SR_B4", "LANDSAT_7": "SR_B4", "LANDSAT_8": "SR_B5", "LANDSAT_9": "SR_B5"}
SCALE = 0.0000275
OFFSET = -0.2
YEARS = list(range(2015, 2027))
ASSETS = ["Epor", "Zulia", "Musamya"]


def _masked_ndvi(image, red_band, nir_band):
    qa = image.select("QA_PIXEL")
    cloud = qa.bitwiseAnd(1 << 3).neq(0)
    shadow = qa.bitwiseAnd(1 << 4).neq(0)
    valid = cloud.Or(shadow).Not()
    red = image.select(red_band).multiply(SCALE).add(OFFSET)
    nir = image.select(nir_band).multiply(SCALE).add(OFFSET)
    ndvi = nir.subtract(red).divide(nir.add(red)).rename("ndvi")
    return ndvi.updateMask(valid)


def yearly_ndvi(aoi: ee.Geometry, year: int) -> dict:
    per_mission = {}
    total_scenes = 0
    for mission, collection_id in LANDSAT_COLLECTIONS.items():
        collection = (
            ee.ImageCollection(collection_id)
            .filterBounds(aoi)
            .filterDate(f"{year}-01-01", f"{year + 1}-01-01")
        )
        n = collection.size().getInfo()
        if n == 0:
            continue
        ndvi_collection = collection.map(lambda img, m=mission: _masked_ndvi(img, RED_BAND[m], NIR_BAND[m]))
        mean_image = ndvi_collection.mean()
        stat = mean_image.reduceRegion(reducer=ee.Reducer.mean(), geometry=aoi, scale=30, maxPixels=1e9, bestEffort=True).getInfo()
        ndvi_value = stat.get("ndvi")
        if ndvi_value is not None:
            per_mission[mission] = {"scene_count": n, "ndvi_mean": ndvi_value}
            total_scenes += n
    return {"year": year, "by_mission": per_mission, "total_scenes": total_scenes}


def main() -> None:
    ensure_earth_engine_initialized()
    database_url = os.environ["CANONICAL_DATABASE_URL"]
    engine = engine_for(database_url)
    report = {}

    with Session(engine) as db:
        cohort = load_cohort(db, country="UG", cohort_key="uganda-cfr-observation-cohort", definition_version="v1")
        for asset in ASSETS:
            aoi_version_id = cohort.get(asset)
            if aoi_version_id is None:
                report[asset] = {"error": "not in frozen cohort"}
                continue
            geojson = db.execute(
                text(
                    """
                    SELECT ST_AsGeoJSON(ST_Transform(go.geometry, 4326))
                    FROM geo.aoi_version av JOIN geo.geometry_observation go ON go.id = av.geometry_observation_id
                    WHERE av.id = :id
                    """
                ),
                {"id": aoi_version_id},
            ).scalar()
            aoi = ee.Geometry(json.loads(geojson))
            print(f"--- {asset} ---", flush=True)
            years_result = []
            for year in YEARS:
                try:
                    result = yearly_ndvi(aoi, year)
                except Exception as exc:  # noqa: BLE001 - one year's failure must not abort the run
                    result = {"year": year, "error": f"{type(exc).__name__}: {exc}"}
                years_result.append(result)
                print(f"  {year}: {result}", flush=True)
            report[asset] = {"years": years_result}

    out_path = Path(__file__).resolve().parents[2] / "outputs" / "eo" / "landsat_long_history.json"
    out_path.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
