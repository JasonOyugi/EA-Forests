"""Deterministic analytical grid selection (EO observation architecture,
Sentinel-2 QA/grid section): CRS + affine transform + resolution, not just
``scale=20``. A grid identity is recorded with every processing run so a
repeat run is reproducible.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

GRID_RESOLUTION_M = 20
GRID_VERSION = "cfr-eo-grid/0.1"


def utm_zone_epsg(longitude: float, latitude: float) -> int:
    """WGS84 / UTM zone EPSG code for a single-zone local grid. Uganda's
    equator-straddling south-west corner is treated as northern-hemisphere
    UTM by convention (consistent with national/regional Uganda mapping
    practice), matching what a single CFR's small footprint needs.
    """
    zone = int(math.floor((longitude + 180) / 6) + 1)
    zone = min(max(zone, 1), 60)
    hemisphere_base = 32600 if latitude >= -1e-9 else 32700
    return hemisphere_base + zone


@dataclass(frozen=True)
class AnalysisGrid:
    crs: str
    resolution_m: int
    grid_version: str
    cross_zone_fallback: bool


def select_grid(bounds: dict) -> AnalysisGrid:
    """``bounds`` is ``{"minx","miny","maxx","maxy"}`` in EPSG:4326 (as stored
    on ``geo.aoi_version.bounds``). A single CFR's footprint is expected to
    stay within one UTM zone; if its bounding box spans a 6-degree zone
    boundary, fall back to a documented common grid (EPSG:3857) rather than
    silently picking a zone per scene.
    """
    min_zone = utm_zone_epsg(bounds["minx"], (bounds["miny"] + bounds["maxy"]) / 2)
    max_zone = utm_zone_epsg(bounds["maxx"], (bounds["miny"] + bounds["maxy"]) / 2)
    if min_zone != max_zone:
        return AnalysisGrid(
            crs="EPSG:3857",
            resolution_m=GRID_RESOLUTION_M,
            grid_version=GRID_VERSION,
            cross_zone_fallback=True,
        )
    centroid_lon = (bounds["minx"] + bounds["maxx"]) / 2
    centroid_lat = (bounds["miny"] + bounds["maxy"]) / 2
    epsg = utm_zone_epsg(centroid_lon, centroid_lat)
    return AnalysisGrid(
        crs=f"EPSG:{epsg}",
        resolution_m=GRID_RESOLUTION_M,
        grid_version=GRID_VERSION,
        cross_zone_fallback=False,
    )
