"""Smallest-real-multi-sensor-experiment pull, extended to all 10 pilot sites
(outputs/eo/pilot_site_manifest.json). Live Earth Engine only -- no fake
provider. Tanzania sites use a 300m buffer around the registry point (no
plot boundary exists yet); Uganda CFRs use their real canonical polygon
geometry from the country-pass database. See
outputs/eo/tz-kisolanza/findings.md for the methodology this repeats.

Not part of the production EO pipeline -- a one-off analysis script, same
convention as scripts/run_eo_pilot.py.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import ee
from sqlalchemy import text

from app.db.session import database_url, engine_for
from app.services.site_classification import ensure_earth_engine_initialized

TZ_SITES = [
    {"id": "tz-uchindile", "name": "Uchindile", "lat": -8.72494, "lon": 35.511},
    {"id": "tz-tanwat", "name": "Tanwat", "lat": -9.24236, "lon": 34.8536},
    {"id": "tz-saohill", "name": "Saohill", "lat": -8.49868, "lon": 35.0947},
    {"id": "tz-tabora", "name": "Tabora", "lat": -5.0167, "lon": 32.8},
]

UG_CFRS = ["Zulia", "Musamya", "Epor", "Bunjazi", "Kihihi"]


def ug_geometry(conn, name: str) -> dict:
    row = conn.execute(
        text(
            """
            SELECT ST_AsGeoJSON(ST_Transform(go.geometry, 4326)) AS geojson
            FROM core.entity e
            JOIN geo.aoi a ON a.subject_entity_id = e.id
            JOIN geo.aoi_version av ON av.aoi_id = a.id AND av.superseded_at IS NULL
            JOIN geo.geometry_observation go ON go.id = av.geometry_observation_id
            WHERE e.canonical_name = :name
            """
        ),
        {"name": name},
    ).scalar()
    return json.loads(row)


def pull_site(aoi: ee.Geometry, label: str) -> dict:
    out: dict = {}
    window_start = ee.Date("2026-06-01")
    window_end = ee.Date("2026-09-01")

    s2 = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(aoi)
        .filterDate(window_start, window_end)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 40))
    )
    out["s2_scene_count"] = s2.size().getInfo()
    if out["s2_scene_count"] > 0:
        ndvi = s2.median().normalizedDifference(["B8", "B4"])
        out["s2_ndvi_mean"] = ndvi.reduceRegion(ee.Reducer.mean(), aoi, 10, maxPixels=1e9).get("nd").getInfo()

    s1 = (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(aoi)
        .filterDate(window_start, window_end)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
    )
    out["s1_scene_count"] = s1.size().getInfo()
    s1_asc = s1.filter(ee.Filter.eq("orbitProperties_pass", "ASCENDING"))
    s1_desc = s1.filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING"))
    out["s1_ascending_count"] = s1_asc.size().getInfo()
    out["s1_descending_count"] = s1_desc.size().getInfo()
    if out["s1_ascending_count"] > 0:
        out["s1_asc_vv_db_mean"] = (
            s1_asc.select("VV").mean().reduceRegion(ee.Reducer.mean(), aoi, 10, maxPixels=1e9).get("VV").getInfo()
        )

    for gedi_label, cid, band in [
        ("gedi_l2a_rh98", "LARSE/GEDI/GEDI02_A_002_MONTHLY", "rh98"),
        ("gedi_l2b_cover", "LARSE/GEDI/GEDI02_B_002_MONTHLY", "cover"),
        ("gedi_l4a_agbd", "LARSE/GEDI/GEDI04_A_002_MONTHLY", "agbd"),
    ]:
        col = ee.ImageCollection(cid).filterBounds(aoi).select(band)
        stats = (
            col.mosaic()
            .reduceRegion(
                ee.Reducer.mean().combine(ee.Reducer.count(), "", True).combine(ee.Reducer.minMax(), "", True),
                aoi,
                25,
                maxPixels=1e9,
            )
            .getInfo()
        )
        out[gedi_label] = stats

    palsar2 = ee.ImageCollection("JAXA/ALOS/PALSAR-2/Level2_2/ScanSAR").filterBounds(aoi)
    out["palsar2_scene_count"] = palsar2.size().getInfo()

    dem = ee.Image("NASA/NASADEM_HGT/001")
    out["elevation_m"] = dem.select("elevation").reduceRegion(ee.Reducer.mean(), aoi, 30, maxPixels=1e9).get(
        "elevation"
    ).getInfo()
    out["slope_deg"] = (
        ee.Terrain.slope(dem.select("elevation"))
        .reduceRegion(ee.Reducer.mean(), aoi, 30, maxPixels=1e9)
        .get("slope")
        .getInfo()
    )
    print(f"  done: {label}", flush=True)
    return out


def main() -> None:
    ensure_earth_engine_initialized()
    results = {}

    for site in TZ_SITES:
        print(f"pulling {site['id']} ({site['name']})...", flush=True)
        point = ee.Geometry.Point([site["lon"], site["lat"]])
        aoi = point.buffer(300)
        results[site["id"]] = {"kind": "point_buffer_300m", **pull_site(aoi, site["id"])}

    engine = engine_for(database_url())
    with engine.connect() as conn:
        for name in UG_CFRS:
            site_id = f"ug-{name.lower()}"
            print(f"pulling {site_id} ({name})...", flush=True)
            geojson = ug_geometry(conn, name)
            aoi = ee.Geometry(geojson)
            results[site_id] = {"kind": "canonical_polygon", **pull_site(aoi, site_id)}

    out_path = Path(__file__).resolve().parents[2] / "outputs" / "eo" / "pilot_multisensor_pull_2026-09.json"
    out_path.write_text(json.dumps(results, indent=2, default=str), encoding="utf-8")
    print(f"\nwrote {out_path}")


if __name__ == "__main__":
    main()
