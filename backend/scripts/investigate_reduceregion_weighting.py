"""One-off live investigation: does ee.Reducer.mean()/sum() in reduceRegion
apply fractional pixel-area weighting at AOI boundaries, or a binary
pixel-inclusion rule? Settles this empirically instead of from memory, to
choose the correct moments-v1 implementation (EO country pass Part 2/3).
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import ee  # noqa: E402

from app.services.site_classification import ensure_earth_engine_initialized, safe_getinfo  # noqa: E402

ensure_earth_engine_initialized()

# A 3x3-pixel-aligned square at 20 m in EPSG:32636, then a second geometry
# offset by exactly half a pixel so several boundary pixels are only
# half-covered. If reduceRegion weights by coverage fraction, sum(constant 1)
# should differ from count() for the offset case; if it uses a binary
# pixel-center/majority rule, sum should equal count in both cases.
crs = "EPSG:32636"
scale = 20
ox, oy = 300000, 300000  # arbitrary valid UTM36N easting/northing

aligned = ee.Geometry.Rectangle(
    [ox, oy, ox + 3 * scale, oy + 3 * scale], proj=crs, geodesic=False
)
offset = ee.Geometry.Rectangle(
    [ox + scale / 2, oy + scale / 2, ox + 3 * scale + scale / 2, oy + 3 * scale + scale / 2],
    proj=crs,
    geodesic=False,
)

constant = ee.Image.constant(1)
reducer = ee.Reducer.sum().combine(ee.Reducer.count(), sharedInputs=True)

for label, geom in (("pixel-aligned 3x3", aligned), ("half-pixel-offset 3x3", offset)):
    result = safe_getinfo(
        constant.reduceRegion(reducer=reducer, geometry=geom, crs=crs, scale=scale, maxPixels=1e6)
    )
    print(label, "->", result)

# Unweighted variant for comparison.
unweighted_reducer = ee.Reducer.sum().unweighted().combine(ee.Reducer.count(), sharedInputs=True)
for label, geom in (("unweighted pixel-aligned", aligned), ("unweighted half-offset", offset)):
    result = safe_getinfo(
        constant.reduceRegion(reducer=unweighted_reducer, geometry=geom, crs=crs, scale=scale, maxPixels=1e6)
    )
    print(label, "->", result)
