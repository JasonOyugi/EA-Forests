"""Real multi-sensor structural evidence for the 3 Asset Intelligence
reference assets (Track v5-5/6): Meta/WRI Canopy Height Model v2 (optical
structural) and GEDI L2A/L2B (spaceborne lidar footprints), pulled live
from Google Earth Engine -- confirmed working in this environment this
session (ee.Initialize(project='ee-oyugijason') succeeds; both asset
collections have real, non-empty intersections with all 3 sites).

HONESTY CONSTRAINTS:
  - CHMv2 is treated as CANOPY-SURFACE height structural evidence, not
    ground truth and not individual-tree height (a wall-to-wall raster
    cannot distinguish one tree's crown from its neighbour's in closed
    canopy).
  - GEDI RH98/cover/PAI are real per-footprint lidar returns, but each
    footprint is a ~25m circular sample, not a census -- reported per
    footprint with its own quality flag/sensitivity, not smoothed into a
    single asset-wide number without disclosing footprint count.
  - Neither is converted directly into a tree count or DBH.

Usage:
    uv run python scripts/asset_structural_evidence.py \
        --output ../outputs/asset-intel/asset-structural-evidence-v1.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import ee

REFERENCE_ASSETS = [
    {"canonical_name": "Kapimpini", "lat": 0.98736, "lon": 32.07765},
    {"canonical_name": "Namavundu", "lat": 0.55347, "lon": 33.11138},
    {"canonical_name": "MBOONI SOUTH", "lat": -1.6338, "lon": 37.4368},
]

CHM_ASSET_ID = "projects/meta-forest-monitoring-okw37/assets/CanopyHeight"
GEDI_L2A = "LARSE/GEDI/GEDI02_A_002_MONTHLY"
GEDI_L2B = "LARSE/GEDI/GEDI02_B_002_MONTHLY"
BUFFER_M = 1000  # 1km buffer around each asset's reference point (a coarse proxy for the real polygon, not the polygon itself)


def chm_stats(geom: ee.Geometry) -> dict:
    chm = ee.ImageCollection(CHM_ASSET_ID).mosaic().select(0).rename("height_m")
    stats = chm.reduceRegion(
        reducer=ee.Reducer.mean()
        .combine(ee.Reducer.percentile([10, 50, 90, 98]), sharedInputs=True)
        .combine(ee.Reducer.count(), sharedInputs=True),
        geometry=geom,
        scale=1,
        maxPixels=1e9,
    ).getInfo()
    return stats


def gedi_stats(geom: ee.Geometry) -> dict:
    l2a = ee.ImageCollection(GEDI_L2A).filterBounds(geom).select(["rh98", "quality_flag", "sensitivity"])
    l2b = ee.ImageCollection(GEDI_L2B).filterBounds(geom).select(["cover", "pai", "fhd_normal"])

    def _mean_and_count(coll: ee.ImageCollection, band: str) -> dict:
        img = coll.select(band).mosaic()
        result = img.reduceRegion(reducer=ee.Reducer.mean().combine(ee.Reducer.count(), sharedInputs=True), geometry=geom, scale=25, maxPixels=1e9).getInfo()
        return result

    return {
        "rh98": _mean_and_count(l2a, "rh98"),
        "sensitivity": _mean_and_count(l2a, "sensitivity"),
        "cover": _mean_and_count(l2b, "cover"),
        "pai": _mean_and_count(l2b, "pai"),
        "fhd_normal": _mean_and_count(l2b, "fhd_normal"),
        "l2a_monthly_tiles_intersecting": l2a.size().getInfo(),
        "l2b_monthly_tiles_intersecting": l2b.size().getInfo(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    ee.Initialize(project="ee-oyugijason")

    results = []
    for asset in REFERENCE_ASSETS:
        print(f"Querying structural evidence for {asset['canonical_name']}...")
        geom = ee.Geometry.Point([asset["lon"], asset["lat"]]).buffer(BUFFER_M)
        chm = chm_stats(geom)
        gedi = gedi_stats(geom)
        results.append(
            {
                "canonical_name": asset["canonical_name"],
                "buffer_m": BUFFER_M,
                "note": f"Stats computed over a {BUFFER_M}m buffer around the asset's reference point -- a coarse "
                "proxy for the real canonical polygon (not yet clipped to the exact polygon geometry in this pass).",
                "chmv2": {
                    "source": CHM_ASSET_ID,
                    "epistemic_status": "EO_DERIVED",
                    "note": "Meta/WRI Canopy Height Model v2 -- CANOPY-SURFACE height structural evidence, "
                    "NOT ground truth and NOT individual-tree height (cannot separate adjacent crowns in closed "
                    "canopy).",
                    "stats": chm,
                },
                "gedi": {
                    "source_l2a": GEDI_L2A,
                    "source_l2b": GEDI_L2B,
                    "epistemic_status": "EO_DERIVED",
                    "note": "Real spaceborne lidar footprints (~25m circular samples), not a census. rh98 = "
                    "relative height at 98th percentile of returned energy (canopy top proxy); cover/pai/fhd_normal "
                    "are structural cover/leaf-area/foliage-height-diversity indices. sensitivity flags footprint "
                    "quality; low-sensitivity footprints are less reliable and not filtered out here (see note).",
                    "stats": gedi,
                },
            }
        )

    output = {"model_version": "asset-structural-evidence-v1", "assets": results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {args.output}")
    for r in results:
        chm_mean = r["chmv2"]["stats"].get("height_m_mean")
        gedi_rh98 = r["gedi"]["stats"]["rh98"].get("rh98_mean")
        print(f"  {r['canonical_name']}: CHMv2 mean height={chm_mean}, GEDI rh98 mean={gedi_rh98}")


if __name__ == "__main__":
    main()
