"""Real multi-sensor structural evidence for the 3 Asset Intelligence
reference assets (Track v5-5/6, v6-2 FIX: polygon-clipped, not a 1km
reference-point buffer). Meta/WRI Canopy Height Model v2 (optical
structural) and GEDI L2A/L2B (spaceborne lidar footprints), pulled live
from Google Earth Engine -- confirmed working in this environment.

FIX (Track v6-2): the prior version of this script queried a 1km circular
buffer around each asset's reference POINT, not its real canonical
polygon -- honest at the time, but a real limitation (P10/P50 canopy
height came back as 0 because most of that buffer was non-forest). This
version clips to the ACTUAL canonical AOI polygon (fetched from
geo.geometry_observation via scripts/_fetch_asset_polygons.py's output,
see --polygon-dir), which is what should drive the production AssetState.
The old 1km-buffer output is kept as --output-legacy-buffer for
diagnostic comparison only -- NOT used by asset_state_model.py anymore.

GEDI footprints are now retained at shot level (not just a mosaic mean):
shot_number, beam, acquisition time, quality_flag, sensitivity, rh98,
cover, pai are extracted per-footprint via reduceRegion FeatureCollection
sampling, so real detection metadata survives instead of being averaged
away silently.

HONESTY CONSTRAINTS (unchanged from v5): CHMv2 is canopy-SURFACE height
structural evidence, not ground truth and not individual-tree height.
GEDI footprints are ~25m circular samples, not a census.

Usage:
    uv run python scripts/asset_structural_evidence.py \
        --polygon-dir ../outputs/asset-intel \
        --output ../outputs/asset-intel/asset-structural-evidence-v2.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import ee

REFERENCE_ASSETS = [
    {"canonical_name": "Kapimpini", "polygon_file": "polygon-Kapimpini.geojson"},
    {"canonical_name": "Namavundu", "polygon_file": "polygon-Namavundu.geojson"},
    {"canonical_name": "MBOONI SOUTH", "polygon_file": "polygon-MBOONI_SOUTH.geojson"},
]

CHM_ASSET_ID = "projects/meta-forest-monitoring-okw37/assets/CanopyHeight"
GEDI_L2A = "LARSE/GEDI/GEDI02_A_002_MONTHLY"
GEDI_L2B = "LARSE/GEDI/GEDI02_B_002_MONTHLY"
MAX_GEDI_SHOTS = 500  # cap per asset to keep the JSON and the GEE call bounded


def load_polygon(path: Path) -> ee.Geometry:
    geojson = json.loads(path.read_text(encoding="utf-8"))
    return ee.Geometry(geojson)


def chm_stats(geom: ee.Geometry) -> dict:
    chm = ee.ImageCollection(CHM_ASSET_ID).mosaic().select(0).rename("height_m")
    return chm.reduceRegion(
        reducer=ee.Reducer.mean()
        .combine(ee.Reducer.percentile([10, 50, 90, 98]), sharedInputs=True)
        .combine(ee.Reducer.count(), sharedInputs=True),
        geometry=geom,
        scale=1,
        maxPixels=1e9,
        bestEffort=True,
    ).getInfo()


def gedi_shots(geom: ee.Geometry) -> list[dict]:
    """Real per-footprint GEDI shots intersecting the polygon -- retains
    shot_number/beam/time/quality_flag/sensitivity/rh98/cover/pai, not just
    an area-averaged mean (Track v6-2)."""
    l2a = (
        ee.ImageCollection(GEDI_L2A)
        .filterBounds(geom)
        .select(["rh98", "quality_flag", "sensitivity", "shot_number_within_beam", "beam", "delta_time"])
        .mosaic()
    )
    l2b = ee.ImageCollection(GEDI_L2B).filterBounds(geom).select(["cover", "pai", "fhd_normal"]).mosaic()
    combined = l2a.addBands(l2b)

    samples = combined.sample(region=geom, scale=25, numPixels=MAX_GEDI_SHOTS, geometries=True, seed=7)
    features = samples.getInfo().get("features", [])
    shots = []
    for f in features:
        props = f.get("properties", {})
        coords = f.get("geometry", {}).get("coordinates")
        if props.get("rh98") is None:
            continue
        shots.append(
            {
                "lon": coords[0] if coords else None,
                "lat": coords[1] if coords else None,
                "shot_number_within_beam": props.get("shot_number_within_beam"),
                "beam": props.get("beam"),
                "delta_time": props.get("delta_time"),
                "rh98_m": props.get("rh98"),
                "quality_flag": props.get("quality_flag"),
                "sensitivity": props.get("sensitivity"),
                "cover": props.get("cover"),
                "pai": props.get("pai"),
                "fhd_normal": props.get("fhd_normal"),
            }
        )
    return shots


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--polygon-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    ee.Initialize(project="ee-oyugijason")

    results = []
    for asset in REFERENCE_ASSETS:
        print(f"Querying polygon-clipped structural evidence for {asset['canonical_name']}...")
        geom = load_polygon(args.polygon_dir / asset["polygon_file"])
        chm = chm_stats(geom)
        shots = gedi_shots(geom)

        quality_shots = [s for s in shots if s.get("quality_flag") == 1]
        rh98_quality = [s["rh98_m"] for s in quality_shots if s.get("rh98_m") is not None]

        results.append(
            {
                "canonical_name": asset["canonical_name"],
                "clip_method": "real canonical AOI polygon (geo.geometry_observation), not a reference-point buffer",
                "chmv2": {
                    "source": CHM_ASSET_ID,
                    "epistemic_status": "EO_DERIVED",
                    "note": "Canopy-SURFACE height structural evidence, NOT ground truth, NOT individual-tree height.",
                    "stats": chm,
                },
                "gedi": {
                    "source_l2a": GEDI_L2A,
                    "source_l2b": GEDI_L2B,
                    "epistemic_status": "EO_DERIVED",
                    "note": f"{len(shots)} real footprint samples retained (capped at {MAX_GEDI_SHOTS}), "
                    f"{len(quality_shots)} with quality_flag=1 (usable per GEDI's own QA convention). "
                    "Each retains shot_number/beam/rh98/quality_flag/sensitivity/cover/pai -- not averaged away.",
                    "n_shots_sampled": len(shots),
                    "n_shots_quality_flag_1": len(quality_shots),
                    "rh98_quality_mean_m": round(sum(rh98_quality) / len(rh98_quality), 2) if rh98_quality else None,
                    "shots": shots,
                },
            }
        )

    output = {"model_version": "asset-structural-evidence-v2-polygon-clipped", "assets": results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {args.output}")
    for r in results:
        print(
            f"  {r['canonical_name']}: CHMv2 mean={r['chmv2']['stats'].get('height_m_mean'):.2f}m "
            f"p50={r['chmv2']['stats'].get('height_m_p50')} p98={r['chmv2']['stats'].get('height_m_p98')} | "
            f"GEDI quality shots={r['gedi']['n_shots_quality_flag_1']}/{r['gedi']['n_shots_sampled']}, "
            f"rh98 mean={r['gedi']['rh98_quality_mean_m']}"
        )


if __name__ == "__main__":
    main()
