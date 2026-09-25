"""Public, unauthenticated, read-only EO views for the landing page.

`app.api.eo` (`/api/canonical/eo/...`) is the private administrative API — every route there
requires `Authorization: Bearer <CANONICAL_API_TOKEN>` (see `app.api.canonical.require_access`)
and is disabled entirely unless that token is set server-side. That token must never reach the
browser. This module exposes a narrow, safe subset of the same read models with no auth
dependency, for the public "Latest EO" landing card only. It never accepts writes and returns only
fields already meant to be public (entity name, status, observation month, coverage fraction,
boundary geometry) — no raw evidence artifacts, no administrative fields.
"""

from fastapi import APIRouter, Query
from sqlalchemy import text

from app.api.canonical import DB

router = APIRouter(prefix="/api/eo/public", tags=["EO public"])


@router.get("/country-status")
def public_country_status(db: DB, country: str, limit: int = Query(2000, ge=1, le=2000)):
    """Per-AOI latest EO status for one country (ISO2, e.g. "UG"), with boundary geometry.

    Mirrors `app.api.eo.country_status`'s read model (same tables/join), minus authentication and
    minus any field not already intended to be public. Deliberately not filtered by
    `spatial_type` — different countries' seeded AOIs currently use different spatial types
    (Uganda: "reserve"; Tanzania: "forest_candidate") and this endpoint is one card per country,
    not per asset class. `eo_status` is one of the outcome vocabulary (success/partial/
    no_observation/failed) plus the technical `not_processed` state — never a "forest health"
    score.
    """
    rows = db.execute(
        text(
            """
            SELECT
                e.id AS entity_id,
                e.canonical_name AS name,
                a.id AS aoi_id,
                av.id AS aoi_version_id,
                ST_AsGeoJSON(go.geometry) AS geometry_geojson,
                lo.outcome AS eo_status,
                lo.window_start AS observation_month,
                lo.usable_observation_fraction AS usable_observation_fraction
            FROM core.entity e
            JOIN geo.aoi a ON a.geometry_owner_entity_id = e.id
            JOIN geo.aoi_version av ON av.aoi_id = a.id AND av.superseded_at IS NULL
            JOIN geo.geometry_observation go ON go.id = av.geometry_observation_id
            LEFT JOIN observations.eo_series es ON es.aoi_version_id = av.id
            LEFT JOIN observations.latest_eo_observation lo ON lo.series_id = es.id
            WHERE a.metadata->>'country' = :country
            ORDER BY e.canonical_name
            LIMIT :limit
            """
        ),
        {"country": country, "limit": limit},
    ).mappings()

    return [
        {
            "entityId": str(row["entity_id"]),
            "name": row["name"],
            "aoiId": str(row["aoi_id"]),
            "geometry": row["geometry_geojson"],
            "status": row["eo_status"] or "not_processed",
            "observationMonth": row["observation_month"].strftime("%Y-%m") if row["observation_month"] else None,
            "usableObservationFraction": (
                float(row["usable_observation_fraction"])
                if row["usable_observation_fraction"] is not None
                else None
            ),
        }
        for row in rows
    ]
