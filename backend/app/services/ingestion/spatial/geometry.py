"""Canonical normalization lives in PostGIS, with a deliberately conservative repair policy."""
import json
import math

from sqlalchemy import text


def normalize_geometry(session, geometry, srid):
    if not geometry or geometry.get("type") not in ("Polygon", "MultiPolygon"):
        raise ValueError("Missing or non-polygon geometry")
    if not isinstance(srid, int) or srid <= 0:
        raise ValueError("Missing/unknown original CRS")
    coordinates = geometry.get("coordinates")
    polygons = [coordinates] if geometry["type"] == "Polygon" else coordinates
    if not polygons or any(not p for p in polygons):
        raise ValueError("Empty polygon")
    closed = []
    repaired = False
    for polygon in polygons:
        rings = []
        for ring in polygon:
            if len(ring) < 3:
                raise ValueError("Ring has fewer than three vertices")
            if any(len(p) != 2 or any(not isinstance(x, (int, float)) or not math.isfinite(x)
                                      for x in p) for p in ring):
                raise ValueError("Expected finite 2D coordinates")
            points = [list(p) for p in ring]
            if points[0] != points[-1]:
                points.append(points[0])
                repaired = True
            rings.append(points)
        closed.append(rings)
    # Closing an unclosed ring repeats its first coordinate, changing no vertices.
    # Self-intersections, overlapping multipolygon parts and slivers are quarantined;
    # ST_MakeValid is not used to invent an interpretation of ambiguous topology.
    row = session.execute(text("""
        WITH native AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(:geometry), :srid) AS g),
        canonical AS (SELECT ST_Multi(ST_Force2D(ST_Transform(g,4326))) AS g FROM native)
        SELECT ST_IsValid(g) AS valid, ST_IsValidReason(g) AS reason,
               ST_IsEmpty(g) AS empty,
               ST_CoveredBy(g, ST_MakeEnvelope(-180,-90,180,90,4326)) AS in_bounds,
               encode(ST_AsEWKB(g),'hex') AS ewkb,
               CASE WHEN ST_IsValid(g) THEN ST_Area(g::geography)/10000 END AS area_ha
        FROM canonical
    """), {"geometry": json.dumps({"type": "MultiPolygon", "coordinates": closed}),
           "srid": srid}).mappings().one()
    if not row["valid"] or row["empty"] or not row["in_bounds"] or not row["area_ha"]:
        raise ValueError(f"Invalid geometry: {row['reason']}; empty={row['empty']}; "
                         f"within WGS84 bounds={row['in_bounds']}")
    return {"ewkb": row["ewkb"], "geometry_area_ha": float(row["area_ha"]),
            "validity": "valid", "repair": "close_unclosed_ring" if repaired else None}
