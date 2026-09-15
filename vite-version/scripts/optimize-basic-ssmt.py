#!/usr/bin/env python3

import argparse
import json
import shutil
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from shapely import is_valid, make_valid, union_all
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon, mapping, shape


CORE_PROPERTIES = (
    "country",
    "country_code",
    "species_name",
    "genus",
    "species",
    "suitability_name",
    "suitability_rank",
    "source_layer",
)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Dissolve adjacent Basic SSMT polygons for the public map."
    )
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--species-file", type=Path)
    parser.add_argument("--workers", type=int, default=2)
    return parser.parse_args()


def polygon_parts(geometry):
    if isinstance(geometry, Polygon):
        return [geometry]
    if isinstance(geometry, MultiPolygon):
        return list(geometry.geoms)
    if isinstance(geometry, GeometryCollection):
        return [part for item in geometry.geoms for part in polygon_parts(item)]
    return []


def shared_properties(features):
    first = features[0].get("properties") or {}
    properties = {key: first.get(key) for key in CORE_PROPERTIES}
    for key in set(first) - set(CORE_PROPERTIES):
        values = {json.dumps((feature.get("properties") or {}).get(key), sort_keys=True) for feature in features}
        if len(values) == 1:
            properties[key] = first.get(key)
    return properties


def optimize_chunk(task):
    source_path, destination_path, chunk = task
    collection = json.loads(source_path.read_text(encoding="utf-8"))
    source_features = collection.get("features", [])
    geometries = []
    invalid_count = 0

    for feature in source_features:
        geometry = shape(feature["geometry"])
        if not is_valid(geometry):
            invalid_count += 1
            geometry = make_valid(geometry)
        geometries.extend(polygon_parts(geometry))

    dissolved = union_all(geometries)
    parts = polygon_parts(dissolved)
    properties = shared_properties(source_features)
    features = [
        {"type": "Feature", "properties": properties, "geometry": mapping(part)}
        for part in parts
    ]
    payload = json.dumps(
        {"type": "FeatureCollection", "features": features},
        ensure_ascii=True,
        separators=(",", ":"),
    )
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    destination_path.write_text(payload, encoding="utf-8")

    return {
        **chunk,
        "feature_count": len(features),
        "source_feature_count": len(source_features),
        "repaired_feature_count": invalid_count,
        "byte_size": len(payload.encode("utf-8")),
    }


def main():
    args = parse_args()
    metadata_path = args.input_dir / "metadata.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    allowed_species = None
    if args.species_file:
        galleries = json.loads(args.species_file.read_text(encoding="utf-8"))
        allowed_species = {name.replace(" ", "_") for name in galleries}

    chunks = [
        chunk
        for chunk in metadata["chunks"]
        if allowed_species is None or chunk["species_name"] in allowed_species
    ]
    shutil.rmtree(args.output_dir / "chunks", ignore_errors=True)
    tasks = []
    for chunk in chunks:
        relative_path = Path(chunk["href"].removeprefix("/data/basic-ssmt/"))
        tasks.append(
            (
                args.input_dir / relative_path,
                args.output_dir / relative_path,
                chunk,
            )
        )

    with ProcessPoolExecutor(max_workers=max(1, args.workers)) as executor:
        optimized_chunks = list(executor.map(optimize_chunk, tasks))

    included_codes = {chunk["country_code"] for chunk in optimized_chunks}
    included_species = {chunk["species_name"] for chunk in optimized_chunks}
    optimized_metadata = {
        **metadata,
        "schema_version": 2,
        "countries": [country for country in metadata["countries"] if country["code"] in included_codes],
        "genera": sorted({chunk["genus"] for chunk in optimized_chunks}),
        "species": [species for species in metadata["species"] if species["species_name"] in included_species],
        "chunks": optimized_chunks,
        "notes": [
            *metadata.get("notes", []),
            "Public release: adjacent polygons are dissolved only within identical country, species, and suitability chunks.",
            "Public release: species are limited to the planting-material catalog.",
        ],
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "metadata.json").write_text(
        json.dumps(optimized_metadata, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )

    source_count = sum(chunk["source_feature_count"] for chunk in optimized_chunks)
    rendered_count = sum(chunk["feature_count"] for chunk in optimized_chunks)
    byte_size = sum(chunk["byte_size"] for chunk in optimized_chunks)
    print(
        f"Wrote {len(optimized_chunks)} chunks: {source_count} source polygons -> "
        f"{rendered_count} rendered polygons ({byte_size / 1024 / 1024:.2f} MiB)"
    )


if __name__ == "__main__":
    main()