"""Ingest Uganda CFR polygons as canonical spatial evidence (geo.aoi / geo.aoi_version).

This adds polygon evidence *alongside* the existing centroid geometry that
``MarketImporter.forest`` already writes for every ``central-forest-reserves.json``
record; it never removes or supersedes that point evidence (EO observation
architecture section 7).

Project assumption (EO observation architecture, this task's brief): every
Uganda CFR with a technically usable polygon is in the commercial-EO search
space. That assumption is recorded as ``geo.aoi.analysis_scope`` and is never
used to assert plantation, concession, harvest, or supply state -- those
remain separate evidence-backed claims (``forest.reported_plantable_area``
etc.), untouched by this module.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from uuid import uuid4

from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError

from app.db import schema as s
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.ingestion.cfr_boundaries import (
    AMBIGUOUS,
    BOUNDARIES_PATH,
    POLYGON_LINKED,
    POLYGON_ONLY,
    RECORD_ONLY,
    REPOSITORY,
    ReconciliationRow,
    reconcile,
)
from app.services.ingestion.market_databases import (
    DATA_ROOT,
    MarketImporter,
    synthetic_record,
)
from app.services.state.registry import audit_context, insert_row

NORMALIZATION_VERSION = "cfr-polygon-ingest/0.1"
EO_READINESS_POLICY = "cfr-eo-readiness/0.2"
ANALYSIS_SCOPE = "uganda_cfr_commercial_eo_mvp"
PROVENANCE_CLASS = "UNVERIFIED_REPOSITORY_DERIVED"
AREA_AGREEMENT_READY_THRESHOLD = 0.20  # fraction; drives area_discrepancy_flag only, not readiness.

# BLOCKED_* status names from EO observation architecture section 9.
BLOCKED_NO_POLYGON = "BLOCKED_NO_POLYGON"
BLOCKED_IDENTITY_AMBIGUOUS = "BLOCKED_IDENTITY_AMBIGUOUS"
BLOCKED_INVALID_GEOMETRY = "BLOCKED_INVALID_GEOMETRY"
READY = "READY"
EXPLORATORY = "EXPLORATORY"

# Provenance classes adequate for current operational (READY) use. None of the
# CFR boundary export's polygons currently qualify -- every one is ingested as
# PROVENANCE_CLASS (UNVERIFIED_REPOSITORY_DERIVED) below, so this importer
# always produces EXPLORATORY for valid geometry today. The set exists so a
# future importer with real official/surveyed provenance (e.g. a reviewed NFA
# KML import) can earn READY without changing this classification function.
PROVENANCE_ADEQUATE_FOR_READY = frozenset({"official_kml", "surveyed", "verified_government_source"})


def classify_eo_readiness(provenance_class: str) -> str:
    """EO readiness reflects geometry validity (already required to reach this
    call) and provenance adequacy only. Area discrepancy and ring-topology
    review are separate, non-collapsing signals (area_discrepancy_flag,
    ring_topology_review_required) -- never folded into this classification.
    """
    return READY if provenance_class in PROVENANCE_ADEQUATE_FOR_READY else EXPLORATORY


def _ring_to_wkt(ring: list[list[float]]) -> str:
    # Source rings are [lat, lng]; WKT/GeoJSON coordinate order is x y == lng lat.
    points = ",".join(f"{lng} {lat}" for lat, lng in ring)
    return f"POLYGON(({points}))"


@dataclass
class RingTopologyResult:
    valid: bool
    reason: str | None
    multipolygon_wkt: str | None
    part_count: int
    hole_count: int
    review_required: bool


def resolve_ring_topology(session, rings: list[list[list[float]]]) -> RingTopologyResult:
    """Classify each ring of a CFR as a shell or a hole using real PostGIS
    containment, never by assuming ring order or orientation.

    Depth of geometric containment (how many other rings enclose a given
    ring) determines fill parity: an even number of enclosing rings is solid
    ground (a shell/island); an odd number is a hole. This is the standard
    polygon-with-holes-and-islands model and requires no declared ring roles.
    An overlap between two rings that is neither disjoint nor a clean
    containment is a real topology defect, not a resolvable case.
    """
    wkts = [_ring_to_wkt(ring) for ring in rings]
    if len(wkts) == 1:
        valid = session.scalar(text("SELECT ST_IsValid(ST_GeomFromText(:wkt, 4326))"), {"wkt": wkts[0]})
        if not valid:
            return RingTopologyResult(False, "Self-intersecting or malformed ring", None, 0, 0, False)
        return RingTopologyResult(True, None, f"MULTIPOLYGON((({_coords(rings[0])})))", 1, 0, False)

    rows = session.execute(
        text(
            """
            WITH ring AS (
                SELECT ord, ST_GeomFromText(wkt, 4326) AS geom
                FROM unnest(CAST(:wkts AS text[])) WITH ORDINALITY AS t(wkt, ord)
            )
            SELECT a.ord AS ord, ST_IsValid(a.geom) AS is_valid, ST_Area(a.geom) AS planar_area
            FROM ring a ORDER BY a.ord
            """
        ),
        {"wkts": wkts},
    ).mappings().all()
    invalid = [row["ord"] for row in rows if not row["is_valid"]]
    if invalid:
        return RingTopologyResult(
            False, f"Self-intersecting or malformed ring(s): {invalid}", None, 0, 0, False
        )

    contains: dict[int, set[int]] = {i: set() for i in range(1, len(wkts) + 1)}
    # One row per unordered pair, with both containment directions, so a real
    # shell-contains-hole relationship is never misread as an unresolved
    # overlap just because the reverse direction (hole-contains-shell) is
    # false.
    pairs = session.execute(
        text(
            """
            WITH ring AS (
                SELECT ord, ST_GeomFromText(wkt, 4326) AS geom
                FROM unnest(CAST(:wkts AS text[])) WITH ORDINALITY AS t(wkt, ord)
            )
            SELECT a.ord AS a_ord, b.ord AS b_ord,
                   ST_Contains(a.geom, b.geom) AS a_contains_b,
                   ST_Contains(b.geom, a.geom) AS b_contains_a,
                   ST_Intersects(a.geom, b.geom) AS intersects,
                   ST_Equals(a.geom, b.geom) AS equal_geom
            FROM ring a JOIN ring b ON a.ord < b.ord
            """
        ),
        {"wkts": wkts},
    ).mappings().all()

    for row in pairs:
        a_ord, b_ord = row["a_ord"], row["b_ord"]
        if row["a_contains_b"]:
            contains[b_ord].add(a_ord)
        elif row["b_contains_a"]:
            contains[a_ord].add(b_ord)
        elif row["intersects"] and not row["equal_geom"]:
            return RingTopologyResult(
                False,
                f"Rings {a_ord} and {b_ord} overlap without clean containment",
                None,
                0,
                0,
                False,
            )

    areas = {row["ord"]: row["planar_area"] for row in rows}
    review_required = False
    shells: list[int] = []
    holes_by_shell: dict[int, list[int]] = {}
    for ordinal, ancestors in contains.items():
        depth = len(ancestors)
        if depth % 2 == 0:
            shells.append(ordinal)
        else:
            immediate_parent = min(ancestors, key=lambda a: areas[a])
            holes_by_shell.setdefault(immediate_parent, []).append(ordinal)
            if depth > 1:
                review_required = True

    parts = []
    for shell_ord in shells:
        shell_ring = rings[shell_ord - 1]
        rings_wkt = [_coords(shell_ring)]
        for hole_ord in holes_by_shell.get(shell_ord, []):
            rings_wkt.append(_coords(rings[hole_ord - 1]))
        parts.append("(" + ",".join(f"({r})" for r in rings_wkt) + ")")
    multipolygon_wkt = "MULTIPOLYGON(" + ",".join(parts) + ")"
    hole_count = sum(len(v) for v in holes_by_shell.values())
    return RingTopologyResult(True, None, multipolygon_wkt, len(shells), hole_count, review_required)


def _coords(ring: list[list[float]]) -> str:
    return ",".join(f"{lng} {lat}" for lat, lng in ring)


def _entity_id_for_record(session, source_record_key: str) -> str | None:
    return session.scalar(
        select(s.external_identity.c.entity_id).where(
            s.external_identity.c.dataset == "central-forest-reserves",
            s.external_identity.c.source_record_key == source_record_key,
            s.external_identity.c.role == "asset",
        )
    )


_BOUNDARY_SOURCE_TITLE = "generated-boundaries.ts (ugandaCfrs)"


def _boundary_source(session, store):
    """Register the boundary export as one evidence source, once."""
    existing = (
        session.execute(select(s.source).where(s.source.c.title == _BOUNDARY_SOURCE_TITLE))
        .mappings()
        .first()
    )
    if existing:
        ingest = (
            session.execute(
                select(s.raw_ingest).where(s.raw_ingest.c.source_id == existing["id"])
            )
            .mappings()
            .first()
        )
        return dict(existing), dict(ingest)
    content = BOUNDARIES_PATH.read_bytes()
    uri, digest = store.put(content)
    source = insert_row(
        session,
        s.source,
        source_type="repository_dataset",
        title=_BOUNDARY_SOURCE_TITLE,
        publisher="EA Forests repository",
        uri=BOUNDARIES_PATH.relative_to(REPOSITORY).as_posix(),
        access="restricted",
        data_class="UNKNOWN",
        metadata={
            "provenance_class": PROVENANCE_CLASS,
            "note": (
                "No preprocessing script, original KML/GeoJSON artifact, or transformation "
                "commit was found for this file in the repository or its git history; both "
                "generated-boundaries.ts and central-forest-reserves.json were introduced "
                "whole in single commits with no intermediate parser. Treat as unverified "
                "repository-derived digitisation, never as an official/surveyed boundary."
            ),
        },
    )
    ingest = insert_row(
        session,
        s.raw_ingest,
        source_id=source["id"],
        batch_id=uuid4(),
        artifact_uri=uri,
        content_hash=digest,
        original_filename=BOUNDARIES_PATH.name,
        media_type="text/plain",
        parser_version=NORMALIZATION_VERSION,
    )
    return source, ingest


def ingest_cfr_polygons(session, store=None, only: str | None = None) -> dict:
    """Reconcile and ingest Uganda CFR polygons for every linkable record.

    ``only`` filters by ``source_record_key`` (the central-forest-reserves.json
    key) for fast targeted tests; omit it to process the full 661-record
    reconciliation.
    """
    store = store or LocalArtifactStore()
    audit_context(
        session,
        "cfr-geometry-importer",
        "Ingest Uganda CFR polygons as additional spatial evidence (EO spine)",
    )
    # The polygon evidence binds to the same canonical entity as the existing
    # centroid claim; that entity must already exist. When ``only`` names a
    # single source record, import just that record (this keeps single-CFR
    # tests fast instead of re-running the full 661-record import).
    importer = MarketImporter(session, store)
    try:
        importer.import_file(DATA_ROOT / "central-forest-reserves.json", only=only)
    except ValueError:
        if only is None:
            raise
        # `only` matched a boundary id or an unresolved record, not a JSON key;
        # there is nothing to import and no entity to bind to.
    boundary_source, boundary_ingest = _boundary_source(session, store)

    rows = reconcile()
    if only:
        rows = [r for r in rows if r.source_record_key == only or r.boundary_id == only]
    return {"records": [_ingest_row(session, row, boundary_source, boundary_ingest) for row in rows]}


def _blocked(row: ReconciliationRow, eo_readiness: str) -> dict:
    return {
        "source_record_key": row.source_record_key,
        "boundary_id": row.boundary_id,
        "name": row.name,
        "reconciliation_status": row.status,
        "reported_area_ha": row.reported_area_ha,
        "boundary_reported_area_ha": row.boundary_reported_area_ha,
        "eo_scope": False,
        "eo_readiness": eo_readiness,
        "blocking_reason": row.reason,
        "aoi_id": None,
        "aoi_version_id": None,
    }


def _ingest_row(session, row: ReconciliationRow, boundary_source, boundary_ingest) -> dict:
    if row.status == RECORD_ONLY:
        return _blocked(row, "BLOCKED_NO_POLYGON")
    if row.status == POLYGON_ONLY:
        return _blocked(row, "BLOCKED_NO_POLYGON")
    if row.status == AMBIGUOUS:
        return _blocked(row, "BLOCKED_IDENTITY_AMBIGUOUS")
    assert row.status == POLYGON_LINKED

    entity_id = _entity_id_for_record(session, row.source_record_key)
    if entity_id is None:
        result = _blocked(row, "BLOCKED_NO_CANONICAL_ENTITY")
        result["blocking_reason"] = (
            "central-forest-reserves.json record has no canonical entity yet "
            "(MarketImporter import did not run or was filtered out)"
        )
        return result

    world_id = session.scalar(
        select(s.world.c.id).where(
            s.world.c.name
            == ("legacy-import-quarantine" if synthetic_record(row.record) else "production")
        )
    )

    savepoint = session.begin_nested()
    try:
        topology = resolve_ring_topology(session, row.boundary["polygons"])
        if not topology.valid:
            savepoint.rollback()
            return _blocked(row, "BLOCKED_INVALID_GEOMETRY") | {"blocking_reason": topology.reason}

        evidence = insert_row(
            session,
            s.evidence_item,
            source_id=boundary_source["id"],
            raw_ingest_id=boundary_ingest["id"],
            kind="boundary_polygon",
            data_class="UNKNOWN",
            locator={
                "boundary_id": row.boundary_id,
                "matched_source_record_key": row.source_record_key,
            },
            raw_record=row.boundary,
            content_hash=hashlib.sha256(
                json.dumps(row.boundary, sort_keys=True).encode()
            ).hexdigest(),
        )
        geometry_row = insert_row(
            session,
            s.geometry_observation,
            entity_id=entity_id,
            world_id=world_id,
            geometry=f"SRID=4326;{topology.multipolygon_wkt}",
            method="repository_derived",
            precision_description=(
                "Unverified repository-derived polygon; no recoverable original "
                "KML/GeoJSON artifact or transformation script found in repository history"
            ),
            source_id=boundary_source["id"],
            evidence_item_id=evidence["id"],
            metadata={
                "provenance_class": PROVENANCE_CLASS,
                "original_geometry_artifact": "unavailable",
                "transformation_history": "unknown",
                "digitisation_method": "unknown",
                "boundary_export_id": row.boundary_id,
                "ring_part_count": topology.part_count,
                "ring_hole_count": topology.hole_count,
                "ring_topology_review_required": topology.review_required,
            },
        )
        area_m2 = session.scalar(
            text("SELECT ST_Area(geography(geometry)) FROM geo.geometry_observation WHERE id=:id"),
            {"id": geometry_row["id"]},
        )
        bounds = (
            session.execute(
                text(
                    "SELECT ST_XMin(geometry) AS minx, ST_YMin(geometry) AS miny, "
                    "ST_XMax(geometry) AS maxx, ST_YMax(geometry) AS maxy "
                    "FROM geo.geometry_observation WHERE id=:id"
                ),
                {"id": geometry_row["id"]},
            )
            .mappings()
            .one()
        )

        existing_aoi = (
            session.execute(
                select(s.aoi).where(
                    s.aoi.c.geometry_owner_entity_id == entity_id,
                    s.aoi.c.world_id == world_id,
                    s.aoi.c.analysis_scope == ANALYSIS_SCOPE,
                )
            )
            .mappings()
            .first()
        )
        aoi = (
            dict(existing_aoi)
            if existing_aoi
            else insert_row(
                session,
                s.aoi,
                world_id=world_id,
                geometry_owner_entity_id=entity_id,
                subject_entity_id=entity_id,
                name=row.name,
                analysis_scope=ANALYSIS_SCOPE,
                metadata={"eo_scope": True, "country": "UG", "spatial_type": "reserve"},
            )
        )

        geometry_hash = hashlib.sha256(topology.multipolygon_wkt.encode()).hexdigest()
        existing_version = (
            session.execute(
                select(s.aoi_version).where(
                    s.aoi_version.c.aoi_id == aoi["id"],
                    s.aoi_version.c.geometry_hash == geometry_hash,
                    s.aoi_version.c.superseded_at.is_(None),
                )
            )
            .mappings()
            .first()
        )
        if existing_version:
            # Re-running ingestion on an unchanged boundary must not accumulate
            # duplicate geometry rows; discard the redundant insert this pass made.
            savepoint.rollback()
            return {
                "source_record_key": row.source_record_key,
                "boundary_id": row.boundary_id,
                "name": row.name,
                "reconciliation_status": row.status,
                "reported_area_ha": row.reported_area_ha,
                "boundary_reported_area_ha": row.boundary_reported_area_ha,
                "eo_scope": True,
                "eo_readiness": existing_version["metadata"].get("eo_readiness"),
                "blocking_reason": None,
                "aoi_id": aoi["id"],
                "aoi_version_id": existing_version["id"],
                "area_m2": float(existing_version["area_m2"]),
                "already_ingested": True,
            }

        reported_ha = row.reported_area_ha
        area_ha = float(area_m2) / 10_000
        discrepancy_fraction = (
            abs(area_ha - float(reported_ha)) / float(reported_ha)
            if reported_ha and float(reported_ha) > 0
            else None
        )
        readiness = classify_eo_readiness(PROVENANCE_CLASS)
        area_discrepancy_flag = (
            discrepancy_fraction is None or discrepancy_fraction > AREA_AGREEMENT_READY_THRESHOLD
        )

        next_revision = 1 + (
            session.scalar(
                select(func.max(s.aoi_version.c.revision)).where(s.aoi_version.c.aoi_id == aoi["id"])
            )
            or 0
        )
        aoi_version = insert_row(
            session,
            s.aoi_version,
            aoi_id=aoi["id"],
            world_id=world_id,
            revision=next_revision,
            geometry_observation_id=geometry_row["id"],
            geometry_hash=geometry_hash,
            normalization_version=NORMALIZATION_VERSION,
            area_m2=area_m2,
            bounds={
                "minx": float(bounds["minx"]),
                "miny": float(bounds["miny"]),
                "maxx": float(bounds["maxx"]),
                "maxy": float(bounds["maxy"]),
            },
            source_id=boundary_source["id"],
            evidence_item_id=evidence["id"],
            metadata={
                "eo_readiness": readiness,
                "eo_readiness_policy": EO_READINESS_POLICY,
                "provenance_class": PROVENANCE_CLASS,
                "eo_scope": True,
                "analysis_scope": ANALYSIS_SCOPE,
                "reported_area_ha": float(reported_ha) if reported_ha is not None else None,
                "boundary_reported_area_ha": row.boundary_reported_area_ha,
                "polygon_area_ha": area_ha,
                "area_discrepancy_fraction": discrepancy_fraction,
                # Independent review signals: neither collapses into eo_readiness,
                # which reflects provenance/geometry validity only.
                "area_discrepancy_flag": area_discrepancy_flag,
                "ring_topology_review_required": topology.review_required,
            },
        )
        savepoint.commit()
        return {
            "source_record_key": row.source_record_key,
            "boundary_id": row.boundary_id,
            "name": row.name,
            "reconciliation_status": row.status,
            "reported_area_ha": reported_ha,
            "boundary_reported_area_ha": row.boundary_reported_area_ha,
            "eo_scope": True,
            "eo_readiness": readiness,
            "provenance_class": PROVENANCE_CLASS,
            "area_discrepancy_flag": area_discrepancy_flag,
            "blocking_reason": None,
            "entity_id": entity_id,
            "aoi_id": aoi["id"],
            "aoi_version_id": aoi_version["id"],
            "geometry_observation_id": geometry_row["id"],
            "area_m2": float(area_m2),
            "area_ha": area_ha,
            "area_discrepancy_fraction": discrepancy_fraction,
            "already_ingested": False,
        }
    except DBAPIError as exc:
        savepoint.rollback()
        return _blocked(row, "BLOCKED_INVALID_GEOMETRY") | {
            "blocking_reason": f"Database rejected geometry: {exc.orig}"
        }
