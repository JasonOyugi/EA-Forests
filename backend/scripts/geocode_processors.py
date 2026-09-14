"""Real point-in-country geocoding for the 86-processor database (Track v7,
item 16). FIX: the v2 sprint filtered candidate processors by a distance
proxy ("within 250km therefore Kenyan") because no country field exists on
any of the 86 entries in
vite-version/src/app/shop/data/market-databases/processors.json. That proxy
is replaced here with a real point-in-polygon lookup against the USDOS LSIB
2017 country-boundary dataset in Google Earth Engine (verified live this
sprint; ``USDOS/LSIB_SIMPLIFIED/2017`` does not exist in the current
catalog, ``USDOS/LSIB/2017`` does and was used).

Usage:
    uv run python scripts/geocode_processors.py \
        --processors-json ../vite-version/src/app/shop/data/market-databases/processors.json \
        --output ../outputs/asset-intel/processor_countries.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import ee

LSIB_COLLECTION = "USDOS/LSIB/2017"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--processors-json", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    ee.Initialize(project="ee-oyugijason")

    processors = json.loads(args.processors_json.read_text(encoding="utf-8"))
    countries = ee.FeatureCollection(LSIB_COLLECTION)

    names = list(processors.keys())
    feats = [ee.Feature(ee.Geometry.Point([processors[name]["lon"], processors[name]["lat"]]), {"name": name}) for name in names]
    fc = ee.FeatureCollection(feats)

    joined = ee.Join.saveFirst("country_match").apply(
        primary=fc,
        secondary=countries,
        condition=ee.Filter.intersects(leftField=".geo", rightField=".geo", maxError=1),
    )

    info = joined.getInfo()
    result: dict[str, str | None] = {}
    for f in info["features"]:
        props = f["properties"]
        name = props["name"]
        match = props.get("country_match")
        result[name] = match["properties"].get("COUNTRY_NA") if match else None

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=1), encoding="utf-8")

    no_match = [k for k, v in result.items() if v is None]
    from collections import Counter

    print(f"Wrote {args.output}: {len(result)} processors geocoded, {len(no_match)} unmatched {no_match}")
    print(Counter(result.values()))


if __name__ == "__main__":
    main()
