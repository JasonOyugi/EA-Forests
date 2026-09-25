"""Direct-processing work-unit ceiling and deterministic sharding fallback
(Uganda EO country pass Part 5).

The EO observation architecture originally proposed an initial ceiling of
~5,000 ha / 10,000 vertices / 100 candidate items per work unit. Measured
evidence from the pilot (backend/scripts/run_eo_pilot.py,
docs/data-provenance/uganda-eo-country-pass-report.md) shows a single
``reduceRegion`` call handling Zulia -- 92,559 ha, ~2.3M target cells, 22
candidate items -- reliably in 2.6-21 s across three independent live runs,
well inside ``maxPixels=1e8``, with zero retries or provider errors. Per
that evidence this module raises the direct-processing ceiling (Option B)
while keeping deterministic sharding as a real, tested fallback for AOIs
that exceed it, or after a resource-exhaustion provider error -- never by
simplifying canonical CFR geometry.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from sqlalchemy import text

WORK_LIMITS_VERSION = "eo-work-limits/0.2"
DIRECT_PROCESSING_MAX_AREA_HA = 150_000  # ~1.6x the largest measured single-call CFR (Zulia, 92,559 ha)
DIRECT_PROCESSING_MAX_VERTICES = 50_000
DIRECT_PROCESSING_MAX_CANDIDATE_ITEMS = 300
SHARD_SIDE_M = 10_000  # 10 km x 10 km internal compute shards


def should_shard(*, area_m2: float, vertex_count: int, candidate_item_count: int) -> bool:
    area_ha = area_m2 / 10_000
    return (
        area_ha > DIRECT_PROCESSING_MAX_AREA_HA
        or vertex_count > DIRECT_PROCESSING_MAX_VERTICES
        or candidate_item_count > DIRECT_PROCESSING_MAX_CANDIDATE_ITEMS
    )


@dataclass(frozen=True)
class Shard:
    index: int
    geojson: dict
    area_m2: float


def generate_deterministic_shards(session, geometry_wkt_srid4326: str, grid_crs: str) -> list[Shard]:
    """Non-overlapping internal compute shards covering exactly the pinned
    AOI geometry: a fixed ``SHARD_SIDE_M`` fishnet in the AOI's own analysis
    CRS, clipped to the AOI via real PostGIS intersection (never a
    simplification of the canonical boundary). A shard is compute-support
    only; it is never a new forest asset and carries no independent identity
    beyond its parent AOI version.
    """
    rows = session.execute(
        text(
            """
            WITH aoi AS (
                SELECT ST_Transform(ST_GeomFromText(:wkt, 4326), :grid_srid) AS geom
            ),
            bounds AS (
                SELECT ST_XMin(geom) AS minx, ST_YMin(geom) AS miny,
                       ST_XMax(geom) AS maxx, ST_YMax(geom) AS maxy
                FROM aoi
            ),
            cells AS (
                SELECT (row_number() OVER ())::int AS index,
                       ST_SetSRID(
                         ST_MakeEnvelope(x, y, LEAST(x + :side, b.maxx + :side), LEAST(y + :side, b.maxy + :side)),
                         :grid_srid
                       ) AS cell
                FROM bounds b,
                     generate_series(floor(b.minx / :side)::int * :side, ceil(b.maxx / :side)::int * :side, :side) AS x,
                     generate_series(floor(b.miny / :side)::int * :side, ceil(b.maxy / :side)::int * :side, :side) AS y
            ),
            shards AS (
                SELECT cells.index, ST_Intersection(aoi.geom, cells.cell) AS shard_geom
                FROM cells, aoi
                WHERE ST_Intersects(aoi.geom, cells.cell)
            )
            SELECT index,
                   ST_AsGeoJSON(ST_Transform(shard_geom, 4326)) AS geojson,
                   ST_Area(ST_Transform(shard_geom, 4326)::geography) AS area_m2
            FROM shards
            WHERE NOT ST_IsEmpty(shard_geom) AND ST_Area(shard_geom) > 0
            ORDER BY index
            """
        ),
        {
            "wkt": geometry_wkt_srid4326,
            "grid_srid": int(grid_crs.split(":")[1]),
            "side": SHARD_SIDE_M,
        },
    ).mappings()

    return [
        Shard(index=row["index"], geojson=json.loads(row["geojson"]), area_m2=float(row["area_m2"]))
        for row in rows
    ]
