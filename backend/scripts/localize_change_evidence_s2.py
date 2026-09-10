"""Spatial localization of a real S2 change candidate (observatory v0.2,
sections 5-8): WHERE within the AOI did the observation change appear,
not just "this forest's aggregate series changed". Derived EO evidence
only -- never alters the canonical AOI boundary, never produces a crisp
"harvested compartment" polygon. Cells/regions with inadequate common
support between the baseline and candidate windows are excluded, not
filled in.

Grid: the AOI bounding box is split into an NxN cell grid, each cell
intersected with the real AOI polygon (so a partial-edge cell only
reports support/change for the real forest area inside it, not the full
rectangular cell). Real S2 SR imagery, real SCL cloud/shadow masking
(same rejected classes as the national recipe), real per-cell
reduceRegions -- no synthetic values anywhere.

Regions are formed by simple grid-adjacency (4-connectivity) over cells
whose common support and |change| both clear a real, computed (not
guessed) threshold. This is intentionally not a general-purpose image-
segmentation pipeline; it is scoped to answer "which contiguous part of
this specific AOI changed", per the "evidence region, not harvested
compartment" instruction.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from statistics import mean, pstdev

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import ee
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import engine_for
from app.services.eo.feature_registry import REFLECTANCE_SCALE, SCL_REJECTED_CLASSES
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.site_classification import ensure_earth_engine_initialized

GRID_N = 8
GRID_VERSION = "s2-ndvi-localization-grid/1"


def _mask_and_ndvi(collection: ee.ImageCollection) -> ee.ImageCollection:
    def add_ndvi(image):
        scl = image.select("SCL")
        mask = scl.eq(SCL_REJECTED_CLASSES[0])
        for code in SCL_REJECTED_CLASSES[1:]:
            mask = mask.Or(scl.eq(code))
        valid = mask.Not()
        refl = image.select(["B4", "B8"]).multiply(REFLECTANCE_SCALE)
        ndvi = refl.normalizedDifference(["B8", "B4"]).rename("ndvi").updateMask(valid)
        return ndvi.addBands(valid.rename("valid").toFloat())

    return collection.map(add_ndvi)


def _window_ndvi_and_support(aoi: ee.Geometry, window_start: str, window_end: str) -> tuple[ee.Image, ee.Image]:
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(aoi)
        .filterDate(window_start, window_end)
    )
    with_ndvi = _mask_and_ndvi(collection)
    ndvi_mean = with_ndvi.select("ndvi").mean()
    support_fraction = with_ndvi.select("valid").mean()  # fraction of images where this pixel was valid
    return ndvi_mean, support_fraction


def build_grid_cells(bounds: dict, aoi: ee.Geometry, n: int) -> list[dict]:
    dx = (bounds["maxx"] - bounds["minx"]) / n
    dy = (bounds["maxy"] - bounds["miny"]) / n
    cells = []
    for row in range(n):
        for col in range(n):
            minx = bounds["minx"] + col * dx
            maxx = minx + dx
            miny = bounds["miny"] + row * dy
            maxy = miny + dy
            rect = ee.Geometry.Rectangle([minx, miny, maxx, maxy])
            clipped = rect.intersection(aoi, ee.ErrorMargin(1))
            cells.append({"row": row, "col": col, "geometry": clipped, "cell_id": f"r{row}c{col}"})
    return cells


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--cfr", required=True)
    parser.add_argument("--change-candidate-id", required=True)
    parser.add_argument("--grid-n", type=int, default=GRID_N)
    parser.add_argument(
        "--common-support-min",
        type=float,
        default=0.5,
        help=(
            "Support here is the mean, across every image in the window, of whether a pixel was "
            "SCL-clear -- a stricter metric than the national pipeline's usable_observation_fraction "
            "(which credits a pixel once ANY acquisition covers it). Real observed values for a "
            "multi-month window with typical Uganda cloud cover run ~0.15-0.4, not ~0.5-1.0; pick "
            "this threshold from an actual run's distribution, not a guessed default."
        ),
    )
    args = parser.parse_args()
    COMMON_SUPPORT_MIN = args.common_support_min

    database_url = os.environ["CANONICAL_DATABASE_URL"]
    ensure_earth_engine_initialized()
    engine = engine_for(database_url)

    with Session(engine) as db:
        row = db.execute(
            text(
                """
                SELECT cc.baseline_window_start, cc.baseline_window_end,
                       cc.candidate_window_start, cc.candidate_window_end,
                       av.bounds, ST_AsGeoJSON(ST_Transform(go.geometry, 4326)) AS geojson
                FROM processing.change_candidate cc
                JOIN geo.aoi_version av ON av.id = cc.aoi_version_id
                JOIN geo.geometry_observation go ON go.id = av.geometry_observation_id
                WHERE cc.id = :id
                """
            ),
            {"id": args.change_candidate_id},
        ).mappings().one()

    bounds = row["bounds"]
    aoi = ee.Geometry(json.loads(row["geojson"]))
    baseline_start, baseline_end = row["baseline_window_start"].date().isoformat(), row["baseline_window_end"].date().isoformat()
    candidate_start, candidate_end = row["candidate_window_start"].date().isoformat(), row["candidate_window_end"].date().isoformat()

    cells = build_grid_cells(bounds, aoi, args.grid_n)
    baseline_ndvi, baseline_support = _window_ndvi_and_support(aoi, baseline_start, baseline_end)
    candidate_ndvi, candidate_support = _window_ndvi_and_support(aoi, candidate_start, candidate_end)

    fc = ee.FeatureCollection(
        [ee.Feature(c["geometry"], {"cell_id": c["cell_id"], "row": c["row"], "col": c["col"]}) for c in cells]
    )
    combined = baseline_ndvi.rename("baseline_ndvi").addBands(candidate_ndvi.rename("candidate_ndvi")).addBands(
        baseline_support.rename("baseline_support")
    ).addBands(candidate_support.rename("candidate_support"))

    stats = combined.reduceRegions(
        collection=fc,
        reducer=ee.Reducer.mean(),
        scale=20,
    ).getInfo()

    per_cell = {}
    for feature in stats["features"]:
        props = feature["properties"]
        cell_id = props["cell_id"]
        baseline_m = props.get("baseline_ndvi")
        candidate_m = props.get("candidate_ndvi")
        baseline_sup = props.get("baseline_support")
        candidate_sup = props.get("candidate_support")
        common_support = (
            min(baseline_sup, candidate_sup) if baseline_sup is not None and candidate_sup is not None else None
        )
        change = (candidate_m - baseline_m) if (baseline_m is not None and candidate_m is not None) else None
        per_cell[cell_id] = {
            "row": props["row"],
            "col": props["col"],
            "baseline_ndvi_mean": baseline_m,
            "candidate_ndvi_mean": candidate_m,
            "baseline_support": baseline_sup,
            "candidate_support": candidate_sup,
            "common_support": common_support,
            "change": change,
        }

    usable_changes = [c["change"] for c in per_cell.values() if c["common_support"] is not None and c["common_support"] >= COMMON_SUPPORT_MIN and c["change"] is not None]
    if len(usable_changes) >= 2:
        change_threshold = mean(usable_changes) + 1.5 * pstdev(usable_changes) if pstdev(usable_changes) > 0 else abs(mean(usable_changes)) * 1.5
    else:
        change_threshold = None

    evidence_cells = set()
    for cell_id, c in per_cell.items():
        if c["common_support"] is None or c["common_support"] < COMMON_SUPPORT_MIN or c["change"] is None:
            continue
        if change_threshold is not None and abs(c["change"]) >= change_threshold:
            evidence_cells.add(cell_id)

    # Group evidence cells into 4-connected regions.
    by_rowcol = {(c["row"], c["col"]): cid for cid, c in per_cell.items()}
    visited = set()
    regions = []
    for cell_id in evidence_cells:
        if cell_id in visited:
            continue
        stack = [cell_id]
        region = []
        while stack:
            current = stack.pop()
            if current in visited:
                continue
            visited.add(current)
            region.append(current)
            r, c = per_cell[current]["row"], per_cell[current]["col"]
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                neighbor = by_rowcol.get((r + dr, c + dc))
                if neighbor in evidence_cells and neighbor not in visited:
                    stack.append(neighbor)
        regions.append(region)

    region_summaries = []
    for region in regions:
        changes = [per_cell[cid]["change"] for cid in region]
        supports = [per_cell[cid]["common_support"] for cid in region]
        region_summaries.append(
            {
                "cell_ids": region,
                "cell_count": len(region),
                "mean_change": mean(changes),
                "mean_common_support": mean(supports),
            }
        )
    region_summaries.sort(key=lambda r: -r["cell_count"])

    result = {
        "change_candidate_id": args.change_candidate_id,
        "cfr": args.cfr,
        "grid_version": GRID_VERSION,
        "grid_n": args.grid_n,
        "common_support_min": COMMON_SUPPORT_MIN,
        "change_threshold": change_threshold,
        "baseline_window": [baseline_start, baseline_end],
        "candidate_window": [candidate_start, candidate_end],
        "cell_count_total": len(per_cell),
        "cell_count_with_common_support": len(usable_changes),
        "evidence_cell_count": len(evidence_cells),
        "region_count": len(regions),
        "regions": region_summaries,
        "per_cell": per_cell,
    }

    store = LocalArtifactStore(os.environ.get("CANONICAL_ARTIFACT_ROOT", ".cache/canonical-artifacts"))
    uri, digest = store.put(json.dumps(result, indent=2, default=str).encode())

    out_path = Path(__file__).resolve().parents[2] / "outputs" / "eo" / f"change_evidence_regions_{args.cfr.replace(' ', '_')}.json"
    out_path.write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "per_cell"}, indent=2, default=str))
    print(f"artifact: {uri} (sha256={digest})")
    print(f"wrote {out_path}")

    with Session(engine) as db:
        row = db.execute(
            text("SELECT metadata FROM processing.change_candidate WHERE id = :id"), {"id": args.change_candidate_id}
        ).mappings().one()
        metadata = dict(row["metadata"])
        metadata["spatial_evidence"] = {
            "artifact_uri": uri,
            "artifact_sha256": digest,
            "grid_version": GRID_VERSION,
            "region_count": len(regions),
            "evidence_cell_count": len(evidence_cells),
            "cell_count_total": len(per_cell),
            "note": (
                "Change-evidence regions, not a harvested-compartment polygon. "
                "Cells below common-support threshold excluded, not filled."
            ),
        }
        db.execute(
            text("UPDATE processing.change_candidate SET metadata = CAST(:m AS JSONB) WHERE id = :id"),
            {"m": json.dumps(metadata, default=str), "id": args.change_candidate_id},
        )
        db.commit()
    print("attached spatial_evidence summary to change_candidate.metadata")


if __name__ == "__main__":
    main()
