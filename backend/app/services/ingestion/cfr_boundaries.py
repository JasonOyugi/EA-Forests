"""Reconcile Uganda Central Forest Reserve (CFR) source records against the
repository's frontend boundary export.

Two independent representations exist and neither is authoritative by construction:

* ``vite-version/src/app/shop/data/market-databases/central-forest-reserves.json``
  -- 661 records keyed by reserve name, each with a ``lon``/``lat`` centroid.
  ``MarketImporter.forest`` already imports this as point evidence.
* ``vite-version/src/app/shop/data/generated-boundaries.ts`` -- a TypeScript
  module exporting ``ugandaCfrs: UgandaCfrBoundary[]``, each with an ``id``,
  ``name``, reported ``areaHa`` and one or more coordinate rings (``polygons``).

No preprocessing script, KML/GeoJSON artifact, or transformation code for the
boundary export was found anywhere in the repository or its git history (both
files were introduced whole in single commits with no intermediate parser).
The boundary export therefore has no recoverable original artifact; its
provenance is classified conservatively as ``UNVERIFIED_REPOSITORY_DERIVED``,
never as an official/surveyed boundary, regardless of the JSON's own
``"Data source": "Ugandabmap.kml"`` claim, which describes the *point* dataset
and cannot itself vouch for the separately authored polygon export.

There is no shared stable ID between the two files: the JSON's dataset key is
the reserve name; the boundary export's ``id`` is an independently generated
slug. Reconciliation therefore matches on a normalized reserve name, the only
common human-assigned attribute, and refuses to guess past a collision.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REPOSITORY = Path(__file__).resolve().parents[4]
BOUNDARIES_PATH = (
    REPOSITORY / "vite-version/src/app/shop/data/generated-boundaries.ts"
)
CENTRAL_FOREST_RESERVES_JSON = (
    REPOSITORY
    / "vite-version/src/app/shop/data/market-databases/central-forest-reserves.json"
)

# Statuses from EO_OBSERVATION_ARCHITECTURE section 4/9. Never invent a fifth.
POLYGON_LINKED = "POLYGON_LINKED"
POLYGON_ONLY = "POLYGON_ONLY"
RECORD_ONLY = "RECORD_ONLY"
AMBIGUOUS = "AMBIGUOUS"
INVALID_GEOMETRY = "INVALID_GEOMETRY"


def normalize_reserve_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip()).lower()


def _extract_array_literal(source: str, export_name: str) -> Any:
    """Pull one ``export const <export_name>: T[] = [...]`` array literal.

    The declared value is plain JSON (double-quoted keys/strings, no trailing
    commas, no TS-only syntax) even though the surrounding file is TypeScript,
    so a direct ``json.loads`` on the sliced literal is exact -- not a
    best-effort scrape.
    """
    marker = f"export const {export_name}"
    start = source.index(marker)
    bracket = source.index("[", source.index("=", start))
    depth = 0
    for index in range(bracket, len(source)):
        char = source[index]
        if char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                return json.loads(source[bracket : index + 1])
    raise ValueError(f"Unterminated array literal for {export_name}")


def load_boundaries(path: Path = BOUNDARIES_PATH) -> list[dict]:
    """Parse ``ugandaCfrs`` from the generated boundary export.

    Coordinates in the source file are ``[lat, lng]`` pairs (the module's own
    ``LatLngTuple`` documents this Leaflet convention, and West Nile Uganda
    coordinates around ``[3.4, 31.1]`` confirm latitude leads). Callers that
    build GeoJSON/WKT must swap to ``[lng, lat]`` themselves.
    """
    return _extract_array_literal(path.read_text(encoding="utf-8-sig"), "ugandaCfrs")


def load_central_forest_reserve_records(
    path: Path = CENTRAL_FOREST_RESERVES_JSON,
) -> dict[str, dict]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


@dataclass
class ReconciliationRow:
    source_record_key: str | None
    boundary_id: str | None
    boundary_index: int | None
    name: str
    status: str
    reported_area_ha: float | None = None
    boundary_reported_area_ha: float | None = None
    boundary_ring_count: int | None = None
    reason: str | None = None
    record: dict | None = None
    boundary: dict | None = None


def reconcile(
    records: dict[str, dict] | None = None, boundaries: list[dict] | None = None
) -> list[ReconciliationRow]:
    """Match JSON records to boundary polygons by normalized name only.

    Ambiguity is never resolved by fuzzy matching, area proximity, or
    coordinate proximity: a name collision on either side marks every
    participant AMBIGUOUS and stops there.
    """
    records = load_central_forest_reserve_records() if records is None else records
    boundaries = load_boundaries() if boundaries is None else boundaries

    # Group by list position, not by ``id``: two boundary records can (and do,
    # for "cfr-kabula") share the same slug while remaining physically
    # distinct polygons. Using ``id`` as the dedupe key would silently drop
    # one of them.
    indexed_boundaries = list(enumerate(boundaries))
    boundaries_by_name: dict[str, list[tuple[int, dict]]] = {}
    for index, boundary in indexed_boundaries:
        boundaries_by_name.setdefault(normalize_reserve_name(boundary["name"]), []).append(
            (index, boundary)
        )
    records_by_name: dict[str, list[str]] = {}
    for key in records:
        records_by_name.setdefault(normalize_reserve_name(key), []).append(key)

    rows: list[ReconciliationRow] = []
    matched_boundary_indices: set[int] = set()

    for key, record in records.items():
        name = normalize_reserve_name(key)
        boundary_group = boundaries_by_name.get(name, [])
        record_group = records_by_name.get(name, [])
        if not boundary_group:
            rows.append(
                ReconciliationRow(
                    source_record_key=key,
                    boundary_id=None,
                    boundary_index=None,
                    name=key,
                    status=RECORD_ONLY,
                    reported_area_ha=record.get("plantable_area_ha"),
                    reason="No boundary export entry with a matching normalized name",
                    record=record,
                )
            )
        elif len(boundary_group) > 1 or len(record_group) > 1:
            for index, _boundary in boundary_group:
                matched_boundary_indices.add(index)
            rows.append(
                ReconciliationRow(
                    source_record_key=key,
                    boundary_id=None,
                    boundary_index=None,
                    name=key,
                    status=AMBIGUOUS,
                    reported_area_ha=record.get("plantable_area_ha"),
                    reason=(
                        f"Normalized name {name!r} matches {len(boundary_group)} boundary "
                        f"record(s) and {len(record_group)} source record(s); refusing to "
                        "guess the correspondence"
                    ),
                    record=record,
                )
            )
        else:
            index, boundary = boundary_group[0]
            matched_boundary_indices.add(index)
            rows.append(
                ReconciliationRow(
                    source_record_key=key,
                    boundary_id=boundary["id"],
                    boundary_index=index,
                    name=key,
                    status=POLYGON_LINKED,
                    reported_area_ha=record.get("plantable_area_ha"),
                    boundary_reported_area_ha=boundary.get("areaHa"),
                    boundary_ring_count=len(boundary.get("polygons", [])),
                    record=record,
                    boundary=boundary,
                )
            )

    for index, boundary in indexed_boundaries:
        if index in matched_boundary_indices:
            continue
        name = normalize_reserve_name(boundary["name"])
        boundary_group = boundaries_by_name.get(name, [])
        status = AMBIGUOUS if len(boundary_group) > 1 else POLYGON_ONLY
        rows.append(
            ReconciliationRow(
                source_record_key=None,
                boundary_id=boundary["id"],
                boundary_index=index,
                name=boundary["name"],
                status=status,
                boundary_reported_area_ha=boundary.get("areaHa"),
                boundary_ring_count=len(boundary.get("polygons", [])),
                reason=(
                    "Ambiguous boundary name collision"
                    if status == AMBIGUOUS
                    else "No central-forest-reserves.json record with a matching normalized name"
                ),
                boundary=boundary,
            )
        )
    return rows
