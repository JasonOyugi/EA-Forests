import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import DBAPIError

from app.db import schema as s
from app.services.ingestion.cfr_boundaries import (
    AMBIGUOUS,
    POLYGON_LINKED,
    RECORD_ONLY,
    normalize_reserve_name,
    reconcile,
)
from app.services.ingestion.cfr_geometry import (
    BLOCKED_IDENTITY_AMBIGUOUS,
    BLOCKED_INVALID_GEOMETRY,
    BLOCKED_NO_POLYGON,
    EXPLORATORY,
    READY,
    ingest_cfr_polygons,
    resolve_ring_topology,
)

pytestmark = pytest.mark.integration


def test_reconciliation_is_stable_and_flags_the_kabula_collision():
    rows = reconcile()
    assert len(rows) == 661
    by_key = {r.source_record_key: r for r in rows if r.source_record_key}
    assert by_key["Lodonga"].status == POLYGON_LINKED
    assert by_key["Lodonga"].boundary_id == "cfr-lodonga"
    # Two distinct boundary entries share both name and id "cfr-kabula";
    # the record side must refuse to guess which is which.
    assert by_key["Kabula"].status == AMBIGUOUS
    assert by_key["Kabula (2)"].status == RECORD_ONLY
    statuses = {r.status for r in rows}
    assert statuses <= {POLYGON_LINKED, AMBIGUOUS, RECORD_ONLY, "POLYGON_ONLY", "INVALID_GEOMETRY"}


def test_normalize_reserve_name_collapses_whitespace_and_case():
    assert normalize_reserve_name("  Gung  -  Gung ") == "gung - gung"
    assert normalize_reserve_name("Lodonga") == normalize_reserve_name("lodonga")


def test_single_ring_polygon_ingested_with_area_and_provenance(db, store):
    report = ingest_cfr_polygons(db, store, only="Lodonga")
    (record,) = report["records"]
    assert record["reconciliation_status"] == POLYGON_LINKED
    assert record["eo_scope"] is True
    assert record["eo_readiness"] in (READY, EXPLORATORY)
    assert record["aoi_id"] and record["aoi_version_id"] and record["geometry_observation_id"]
    # Reported (source) area and polygon-derived area are both preserved, distinctly.
    assert record["reported_area_ha"] == pytest.approx(107.028796)
    assert record["area_ha"] == pytest.approx(107.028796, rel=0.05)
    assert record["reported_area_ha"] != record["area_ha"]

    geometry_observation = (
        db.execute(
            select(s.geometry_observation).where(
                s.geometry_observation.c.id == record["geometry_observation_id"]
            )
        )
        .mappings()
        .one()
    )
    assert geometry_observation["method"] == "digitised"
    assert geometry_observation["metadata"]["provenance_class"] == "UNVERIFIED_REPOSITORY_DERIVED"

    aoi = db.execute(select(s.aoi).where(s.aoi.c.id == record["aoi_id"])).mappings().one()
    assert aoi["analysis_scope"] == "uganda_cfr_commercial_eo_mvp"
    assert aoi["subject_entity_id"] == aoi["geometry_owner_entity_id"] == record["entity_id"]

    aoi_version = (
        db.execute(select(s.aoi_version).where(s.aoi_version.c.id == record["aoi_version_id"]))
        .mappings()
        .one()
    )
    assert aoi_version["revision"] == 1
    assert aoi_version["metadata"]["eo_scope"] is True


def test_multipolygon_and_hole_ingestion_uses_real_containment(db, store):
    report = ingest_cfr_polygons(db, store, only="Tororo")
    (record,) = report["records"]
    assert record["reconciliation_status"] == POLYGON_LINKED
    assert record["eo_scope"] is True
    geometry_observation = (
        db.execute(
            select(s.geometry_observation).where(
                s.geometry_observation.c.id == record["geometry_observation_id"]
            )
        )
        .mappings()
        .one()
    )
    assert geometry_observation["metadata"]["ring_part_count"] >= 1
    is_multi = db.scalar(
        text("SELECT GeometryType(geometry) FROM geo.geometry_observation WHERE id=:id"),
        {"id": record["geometry_observation_id"]},
    )
    assert is_multi == "MULTIPOLYGON"
    is_valid = db.scalar(
        text("SELECT ST_IsValid(geometry) FROM geo.geometry_observation WHERE id=:id"),
        {"id": record["geometry_observation_id"]},
    )
    assert is_valid is True


def test_ambiguous_identity_blocks_without_writing_any_spatial_row(db, store):
    report = ingest_cfr_polygons(db, store, only="Kabula")
    (record,) = report["records"]
    assert record["reconciliation_status"] == AMBIGUOUS
    assert record["eo_scope"] is False
    assert record["eo_readiness"] == BLOCKED_IDENTITY_AMBIGUOUS
    assert record["aoi_id"] is None and record["aoi_version_id"] is None
    assert record["blocking_reason"]


def test_record_only_blocks_pending_geometry(db, store):
    report = ingest_cfr_polygons(db, store, only="Kabula (2)")
    (record,) = report["records"]
    assert record["reconciliation_status"] == RECORD_ONLY
    assert record["eo_readiness"] == BLOCKED_NO_POLYGON
    assert record["eo_scope"] is False


def test_holes_outside_shells_and_overlap_without_containment_is_invalid(db):
    # Two disjoint squares that also partially overlap: neither ST_Contains
    # relation holds, so this must be rejected, not silently unioned.
    overlapping = [
        [[0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0], [0.0, 0.0]],
        [[0.5, 0.5], [0.5, 1.5], [1.5, 1.5], [1.5, 0.5], [0.5, 0.5]],
    ]
    result = resolve_ring_topology(db, overlapping)
    assert result.valid is False
    assert "overlap" in result.reason.lower()


def test_self_intersecting_single_ring_is_invalid_not_repaired(db):
    bowtie = [[0.0, 0.0], [1.0, 1.0], [1.0, 0.0], [0.0, 1.0], [0.0, 0.0]]
    result = resolve_ring_topology(db, [bowtie])
    assert result.valid is False


def test_true_hole_is_classified_and_area_excludes_it(db):
    shell = [[0.0, 0.0], [0.0, 10.0], [10.0, 10.0], [10.0, 0.0], [0.0, 0.0]]
    hole = [[2.0, 2.0], [2.0, 4.0], [4.0, 4.0], [4.0, 2.0], [2.0, 2.0]]
    result = resolve_ring_topology(db, [shell, hole])
    assert result.valid is True
    assert result.part_count == 1
    assert result.hole_count == 1
    area = db.scalar(
        text("SELECT ST_Area(ST_GeomFromText(:wkt, 4326))"), {"wkt": result.multipolygon_wkt}
    )
    assert area == pytest.approx(100.0 - 4.0, rel=1e-6)


def test_invalid_geometry_is_rejected_by_the_database_not_silently_repaired(db, store):
    invalid_boundary = {
        "id": "cfr-test-invalid",
        "name": "Test Invalid Reserve",
        "areaHa": 10,
        "center": [0, 0],
        "polygons": [[[0.0, 0.0], [1.0, 1.0], [1.0, 0.0], [0.0, 1.0], [0.0, 0.0]]],
    }
    from app.services.ingestion.cfr_boundaries import ReconciliationRow
    from app.services.ingestion.cfr_geometry import (
        _boundary_source,
        _entity_id_for_record,
        _ingest_row,
    )
    from app.services.ingestion.market_databases import DATA_ROOT, MarketImporter

    MarketImporter(db, store).import_file(DATA_ROOT / "central-forest-reserves.json", only="Lodonga")
    entity_id = _entity_id_for_record(db, "Lodonga")
    row = ReconciliationRow(
        source_record_key="Lodonga",
        boundary_id="cfr-test-invalid",
        boundary_index=0,
        name="Lodonga",
        status=POLYGON_LINKED,
        reported_area_ha=107.0,
        boundary_reported_area_ha=10,
        boundary_ring_count=1,
        record={"plantable_area_ha": 107.0, "reserve_profile": {}},
        boundary=invalid_boundary,
    )
    boundary_source, boundary_ingest = _boundary_source(db, store)
    result = _ingest_row(db, row, boundary_source, boundary_ingest)
    assert result["eo_readiness"] == BLOCKED_INVALID_GEOMETRY
    assert result["eo_scope"] is False
    assert entity_id is not None
    assert (
        db.scalar(
            select(s.geometry_observation.c.id).where(
                s.geometry_observation.c.entity_id == entity_id
            )
        )
        is not None
    )  # the original centroid point evidence remains, never removed


def test_aoi_history_is_immutable_and_append_only(db, store):
    report = ingest_cfr_polygons(db, store, only="Lodonga")
    (record,) = report["records"]
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(update(s.aoi).where(s.aoi.c.id == record["aoi_id"]).values(name="renamed"))
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(
            update(s.aoi_version)
            .where(s.aoi_version.c.id == record["aoi_version_id"])
            .values(area_m2=999)
        )


def test_world_mismatch_between_aoi_and_geometry_observation_is_rejected(db, store):
    report = ingest_cfr_polygons(db, store, only="Adjumani")
    (record,) = report["records"]
    other_world = db.scalar(
        select(s.world.c.id).where(s.world.c.name == "legacy-import-quarantine")
    )
    current_world = db.execute(
        select(s.aoi.c.world_id).where(s.aoi.c.id == record["aoi_id"])
    ).scalar()
    assert other_world != current_world
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(
            s.aoi_version.insert().values(
                aoi_id=record["aoi_id"],
                world_id=other_world,
                revision=2,
                geometry_observation_id=record["geometry_observation_id"],
                geometry_hash="deadbeef",
                normalization_version="test/0.1",
                area_m2=1,
                bounds={},
                source_id=db.execute(
                    select(s.aoi_version.c.source_id).where(
                        s.aoi_version.c.id == record["aoi_version_id"]
                    )
                ).scalar(),
                evidence_item_id=db.execute(
                    select(s.aoi_version.c.evidence_item_id).where(
                        s.aoi_version.c.id == record["aoi_version_id"]
                    )
                ).scalar(),
            )
        )


def test_reingestion_is_idempotent_and_does_not_duplicate_rows(db, store):
    first = ingest_cfr_polygons(db, store, only="Lodonga")["records"][0]
    second = ingest_cfr_polygons(db, store, only="Lodonga")["records"][0]
    assert second["already_ingested"] is True
    assert second["aoi_version_id"] == first["aoi_version_id"]
    versions = db.execute(
        select(s.aoi_version.c.id).where(s.aoi_version.c.aoi_id == first["aoi_id"])
    ).scalars().all()
    assert len(versions) == 1


def test_cfr_identity_never_implies_plantation_or_harvestability(db, store):
    report = ingest_cfr_polygons(db, store, only="Adjumani")
    entity_id = report["records"][0]["entity_id"]
    forbidden_keys = (
        "forest.plantation_area",
        "forest.harvestable_area",
        "forest.harvest_rights",
        "forest.concession_rights",
        "forest.standing_volume",
        "forest.merchantable_volume",
    )
    # This ingestion path writes spatial evidence only; it must never create a
    # fact asserting plantation, harvest, concession, or standing-volume state
    # for the reserve entity (those remain separate, source-backed claims).
    variable_ids = (
        db.execute(
            select(s.variable_definition.c.id).where(
                s.variable_definition.c.key.in_(forbidden_keys)
            )
        )
        .scalars()
        .all()
    )
    for table in (s.assertion, s.observation):
        rows = (
            db.execute(
                select(table.c.id).where(
                    table.c.subject_entity_id == entity_id,
                    table.c.variable_definition_id.in_(variable_ids),
                )
            )
            .scalars()
            .all()
        )
        assert rows == []


def test_exploratory_readiness_still_counts_as_eo_scope(db, store):
    # A valid polygon whose area disagrees sharply with the reported source
    # area is EXPLORATORY, not excluded: exploratory provenance must not
    # remove a CFR from the EO processing universe (task section 9).
    from app.services.ingestion.cfr_boundaries import ReconciliationRow
    from app.services.ingestion.cfr_geometry import _boundary_source, _ingest_row
    from app.services.ingestion.market_databases import DATA_ROOT, MarketImporter

    MarketImporter(db, store).import_file(DATA_ROOT / "central-forest-reserves.json", only="Lodonga")
    boundary_source, boundary_ingest = _boundary_source(db, store)
    disagreeing_boundary = {
        "id": "cfr-test-disagreeing",
        "name": "Lodonga",
        "areaHa": 500,
        "center": [3.4128, 31.09547],
        "polygons": [
            [
                [3.40505, 31.09565],
                [3.40521, 31.09758],
                [3.40545, 31.09874],
                [3.42127, 31.09653],
                [3.42088, 31.09242],
                [3.40569, 31.0922],
                [3.40506, 31.09261],
                [3.40432, 31.09542],
                [3.40505, 31.09565],
            ]
        ],
    }
    row = ReconciliationRow(
        source_record_key="Lodonga",
        boundary_id="cfr-test-disagreeing",
        boundary_index=0,
        name="Lodonga",
        status=POLYGON_LINKED,
        reported_area_ha=5000,
        boundary_reported_area_ha=500,
        boundary_ring_count=1,
        record={"plantable_area_ha": 5000, "reserve_profile": {}},
        boundary=disagreeing_boundary,
    )
    result = _ingest_row(db, row, boundary_source, boundary_ingest)
    assert result["eo_readiness"] == EXPLORATORY
    assert result["eo_scope"] is True
    assert result["area_discrepancy_fraction"] > 0.20
