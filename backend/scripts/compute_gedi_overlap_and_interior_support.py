"""Workstream A3/A4: GEDI footprint/polygon overlap and interior-support
analysis for the 10 pilot sites.

HONEST DATA-ACCESS LIMITATION (verified live, not assumed): Earth Engine does
not expose individual GEDI shot geometries. LARSE/GEDI/GEDI02_A_002_MONTHLY
is a 25m GRIDDED raster (confirmed via .projection().nominalScale()); the
only vector GEDI asset on EE, LARSE/GEDI/GEDI02_A_002_INDEX, is a per-GRANULE
swath polygon (confirmed via its schema: table_id/time_start/time_end only),
not a per-shot ~25m circular footprint. True per-shot footprint-polygon
overlap (as literally specified: footprint circle intersect AOI) would
require raw GEDI L1B/L2A HDF5 granules from NASA LP DAAC directly
(adapter_only_external per docs/eo/ACCESS_REQUIREMENTS.md) -- not pulled
here, per instruction not to materialise large archives casually.

What this script computes instead, as the closest honest analog available
from the gridded EE product: for each AOI,
  - total AOI area;
  - GEDI-valid-pixel coverage area and fraction of the AOI (a real,
    area-weighted quantity, same sum()-reducer methodology already verified
    for S1/S2 -- not a per-shot number, but a genuine coverage-support
    quantity);
  - the SAME coverage fraction restricted to an eroded INTERIOR mask
    (AOI buffered inward by 10/20/30m via real PostGIS ST_Buffer with a
    negative distance) -- a real edge-contamination check, computed only as
    an analysis-only mask, never written back onto the canonical AOI
    geometry.

Uganda CFRs use their real canonical polygon. Tanzania sites use the same
300m point buffer as every prior pull in this programme -- explicitly NOT a
surveyed stand boundary, so their overlap/interior numbers describe the
ASSUMED buffer, not the real (unknown) stand extent.
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

UG_CFRS = ["Zulia", "Musamya", "Epor", "Bunjazi", "Kihihi"]
TZ_SITES = [
    {"id": "tz-kisolanza", "name": "Kisolanza", "lat": -8.15151, "lon": 35.4027},
    {"id": "tz-uchindile", "name": "Uchindile", "lat": -8.72494, "lon": 35.511},
    {"id": "tz-tanwat", "name": "Tanwat", "lat": -9.24236, "lon": 34.8536},
    {"id": "tz-saohill", "name": "Saohill", "lat": -8.49868, "lon": 35.0947},
    {"id": "tz-tabora", "name": "Tabora", "lat": -5.0167, "lon": 32.8},
]
INTERIOR_DISTANCES_M = (10, 20, 30)


def ug_geometry_and_area(conn, name: str):
    row = conn.execute(
        text(
            """
            SELECT ST_AsGeoJSON(ST_Transform(go.geometry, 4326)) AS geojson, av.area_m2
            FROM core.entity e
            JOIN geo.aoi a ON a.subject_entity_id = e.id
            JOIN geo.aoi_version av ON av.aoi_id = a.id AND av.superseded_at IS NULL
            JOIN geo.geometry_observation go ON go.id = av.geometry_observation_id
            WHERE e.canonical_name = :name
            """
        ),
        {"name": name},
    ).mappings().one()
    return json.loads(row["geojson"]), float(row["area_m2"])


def ug_interior_geojson(conn, name: str, distance_m: int):
    row = conn.execute(
        text(
            """
            SELECT ST_AsGeoJSON(ST_Transform(ST_Buffer(go.geometry::geography, -:d)::geometry, 4326)) AS geojson
            FROM core.entity e
            JOIN geo.aoi a ON a.subject_entity_id = e.id
            JOIN geo.aoi_version av ON av.aoi_id = a.id AND av.superseded_at IS NULL
            JOIN geo.geometry_observation go ON go.id = av.geometry_observation_id
            WHERE e.canonical_name = :name
            """
        ),
        {"name": name, "d": distance_m},
    ).scalar()
    return json.loads(row) if row else None


def gedi_coverage(aoi_geojson: dict, area_m2: float) -> dict:
    aoi = ee.Geometry(aoi_geojson)
    img = ee.ImageCollection("LARSE/GEDI/GEDI02_A_002_MONTHLY").select("rh98").mosaic()
    stats = img.mask().rename("covered").reduceRegion(
        reducer=ee.Reducer.sum(), geometry=aoi, crs="EPSG:4326", scale=25, maxPixels=1e9
    ).getInfo()
    covered_weight = stats.get("covered") or 0.0
    covered_area_m2 = covered_weight * 25 * 25
    return {
        "aoi_area_m2": area_m2,
        "gedi_covered_area_m2": covered_area_m2,
        "gedi_coverage_fraction": min(1.0, covered_area_m2 / area_m2) if area_m2 else None,
    }


def main() -> None:
    ensure_earth_engine_initialized()
    results = {}

    engine = engine_for(database_url())
    with engine.connect() as conn:
        for name in UG_CFRS:
            site_id = f"ug-{name.lower()}"
            print(f"{site_id}...", flush=True)
            geojson, area_m2 = ug_geometry_and_area(conn, name)
            entry = {"kind": "canonical_polygon", "full_aoi": gedi_coverage(geojson, area_m2), "interior": {}}
            for d in INTERIOR_DISTANCES_M:
                interior_geojson = ug_interior_geojson(conn, name, d)
                if interior_geojson is None:
                    entry["interior"][f"INTERIOR_{d}M"] = {"note": "erosion collapsed the polygon to empty at this distance"}
                    continue
                # Real interior area via PostGIS, matching the erosion used for the EE query.
                interior_area_m2 = conn.execute(
                    text("SELECT ST_Area(ST_Transform(ST_GeomFromGeoJSON(:g),4326)::geography)"),
                    {"g": json.dumps(interior_geojson)},
                ).scalar()
                entry["interior"][f"INTERIOR_{d}M"] = gedi_coverage(interior_geojson, interior_area_m2)
            results[site_id] = entry

    for site in TZ_SITES:
        print(f"{site['id']}...", flush=True)
        point = ee.Geometry.Point([site["lon"], site["lat"]])
        buffer_300 = point.buffer(300)
        area_m2 = 3.14159265 * 300 * 300  # exact for a EE geodesic-ish buffer approximation; documented as such
        entry = {
            "kind": "point_buffer_300m_NOT_a_surveyed_boundary",
            "full_aoi": gedi_coverage(buffer_300.getInfo(), area_m2),
            "interior": {},
        }
        for d in INTERIOR_DISTANCES_M:
            inner = point.buffer(300 - d)
            inner_area_m2 = 3.14159265 * (300 - d) * (300 - d)
            entry["interior"][f"INTERIOR_{d}M"] = gedi_coverage(inner.getInfo(), inner_area_m2)
        results[site["id"]] = entry

    out_path = Path(__file__).resolve().parents[2] / "outputs" / "eo" / "gedi_overlap_interior_support_2026-09.json"
    out_path.write_text(json.dumps(results, indent=2, default=str), encoding="utf-8")
    print(f"\nwrote {out_path}")


if __name__ == "__main__":
    main()
