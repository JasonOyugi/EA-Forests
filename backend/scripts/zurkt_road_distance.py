"""Road-network distance for the Zurkt Uganda catchment (Track 3).

Reuses backend/app/services/roundwood_production.py's existing OSRM
helper (osrm_route) rather than reimplementing routing. Reads the
catchment produced by zurkt_supply_catchment.py, requests a road route
for every CFR that doesn't already have a cached one, and writes the
result back with road_km/duration_min/route_source added. Never invents
a road distance: if OSRM cannot route a centroid, road_km is left null
and route_source records "unavailable" -- the straight-line distance
already on each record remains the fallback for any code that needs one.

Idempotent / cache-aware: re-running only routes CFRs missing a route in
the existing --output file (or all of them on a fresh file). Does not
re-hit OSRM for pairs it already has an answer for.

Usage:
    uv run python scripts/zurkt_road_distance.py \
        --input ../outputs/supply/zurkt-uganda-catchment.json \
        --output ../outputs/supply/zurkt-uganda-catchment-routed.json
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.roundwood_production import haversine_km, osrm_route


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--sleep-s", type=float, default=0.3, help="Delay between OSRM requests (be polite to the public router)")
    parser.add_argument("--limit", type=int, default=None, help="Route only the first N CFRs by distance (debug)")
    args = parser.parse_args()

    data = json.loads(args.input.read_text(encoding="utf-8"))
    processor = data["processor"]
    proc_lat, proc_lon = processor["lat"], processor["lon"]

    existing_routes: dict[str, dict] = {}
    if args.output.exists():
        prior = json.loads(args.output.read_text(encoding="utf-8"))
        for cfr in prior.get("cfrs", []):
            if cfr.get("road_km") is not None or cfr.get("route_source") == "unavailable":
                existing_routes[cfr["entity_id"]] = cfr

    cfrs = data["cfrs"]
    if args.limit:
        cfrs = cfrs[: args.limit]

    routed_count = 0
    cached_count = 0
    unavailable_count = 0

    for cfr in cfrs:
        cached = existing_routes.get(cfr["entity_id"])
        if cached is not None:
            cfr.update(
                {
                    "road_km": cached.get("road_km"),
                    "duration_min": cached.get("duration_min"),
                    "route_source": cached.get("route_source"),
                }
            )
            cached_count += 1
            continue

        try:
            routed = osrm_route(proc_lon, proc_lat, cfr["lon"], cfr["lat"])
            cfr["road_km"] = round(routed["distance_km"], 2)
            cfr["duration_min"] = round(routed["duration_min"], 1)
            cfr["route_source"] = "osrm"
            routed_count += 1
        except Exception as exc:
            cfr["road_km"] = None
            cfr["duration_min"] = None
            cfr["route_source"] = "unavailable"
            cfr["route_error"] = f"{type(exc).__name__}: {exc}"
            unavailable_count += 1
        time.sleep(args.sleep_s)

        if (routed_count + unavailable_count) % 20 == 0:
            print(
                f"  ...{routed_count} routed, {unavailable_count} unavailable, "
                f"{cached_count} cached so far",
                flush=True,
            )

    data["road_distance_note"] = (
        "road_km comes from OSRM (router.project-osrm.org) when route_source=='osrm'. "
        "route_source=='unavailable' means OSRM could not route this centroid; "
        "road_km is null there -- straight-line distance_km is NOT substituted "
        "silently. No road distance is invented."
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, indent=2), encoding="utf-8")

    print(f"\nWrote {args.output}")
    print(f"  routed via OSRM: {routed_count}")
    print(f"  reused from cache: {cached_count}")
    print(f"  unavailable (straight-line only): {unavailable_count}")


if __name__ == "__main__":
    main()
