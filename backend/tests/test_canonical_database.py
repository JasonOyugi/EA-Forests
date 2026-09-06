from datetime import UTC, datetime
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.exc import DBAPIError

from app.db import schema as s
from app.domain.values import FactCreate
from app.services.ingestion.market_databases import DATA_ROOT, MarketImporter
from app.services.state.demo import demonstrate
from app.services.state.facts import alias_candidates, create_fact, supersede_fact, temporal_query
from app.services.state.registry import insert_row
from app.services.state.snapshots import build_snapshot, delete_derived_bundle, rebuild_from_run

pytestmark = pytest.mark.integration
AS_OF = datetime(2026, 7, 15, tzinfo=UTC)


def context(db, synthetic=False):
    entity = insert_row(db, s.entity, entity_type="tree", canonical_name="Measured tree")
    source = insert_row(
        db,
        s.source,
        source_type="field_campaign",
        title="Field log",
        data_class="SYNTHETIC" if synthetic else "OBSERVED",
    )
    evidence = insert_row(db, s.evidence_item, source_id=source["id"], kind="field_sheet")
    world = db.scalar(
        select(s.world.c.id).where(
            s.world.c.name == ("legacy-import-quarantine" if synthetic else "production")
        )
    )
    return {
        "subject_entity_id": entity["id"],
        "source_id": source["id"],
        "evidence_item_id": evidence["id"],
        "world_id": world,
        "variable_key": "tree.dbh",
        "numeric_value": 31.7,
        "unit": "cm",
        "epistemic_class": "SYNTHETIC" if synthetic else "OBSERVED",
        "method": "diameter_tape",
    }


def test_postgis_and_foreign_keys(db):
    assert "POSTGIS" in db.scalar(text("SELECT postgis_full_version()"))
    with pytest.raises(DBAPIError), db.begin_nested():
        insert_row(
            db,
            s.entity_alias,
            entity_id="00000000-0000-0000-0000-000000000001",
            alias="invalid",
            resolution_method="test",
        )


def test_numeric_normalization_and_db_validation(db):
    args = context(db)
    row = create_fact(
        db, "observation", FactCreate(**{**args, "numeric_value": "0.317", "unit": "m"})
    )
    assert float(row["numeric_value"]) == 31.7 and row["unit"] == "cm"
    with pytest.raises(DBAPIError), db.begin_nested():
        values = {
            key: value
            for key, value in row.items()
            if key not in ("id", "valid_period", "knowledge_period")
        }
        insert_row(db, s.observation, **{**values, "unit": "kg"})


def test_immutable_facts_sources_and_audit(db):
    row = create_fact(db, "observation", FactCreate(**context(db)))
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(
            update(s.observation).where(s.observation.c.id == row["id"]).values(numeric_value=999)
        )
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(delete(s.observation).where(s.observation.c.id == row["id"]))
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(
            update(s.source).where(s.source.c.id == row["source_id"]).values(title="rewritten")
        )
    assert (
        db.scalar(
            select(func.count())
            .select_from(s.change_event)
            .where(s.change_event.c.record_id == row["id"])
        )
        >= 1
    )


def test_bitemporal_split_and_old_knowledge(db):
    args = context(db)
    old = create_fact(db, "observation", FactCreate(**args))
    known_before = db.scalar(text("SELECT clock_timestamp()"))
    new = supersede_fact(
        db,
        "observation",
        old["id"],
        FactCreate(**{**args, "numeric_value": 40, "valid_from": datetime(2026, 7, 1, tzinfo=UTC)}),
        actor="field-curator",
        reason="Corrected dated measurement",
    )
    known_now = db.scalar(text("SELECT clock_timestamp()"))
    query = lambda when, known: (
        db.execute(
            temporal_query(s.observation, valid_at=when, known_at=known).where(
                s.observation.c.subject_entity_id == args["subject_entity_id"]
            )
        )
        .mappings()
        .one()
    )
    assert query(AS_OF, known_before)["id"] == old["id"]
    assert query(AS_OF, known_now)["id"] == new["id"]
    assert float(query(datetime(2026, 6, 1, tzinfo=UTC), known_now)["numeric_value"]) == 31.7
    with pytest.raises(ValueError):
        supersede_fact(
            db,
            "observation",
            old["id"],
            FactCreate(**args),
            actor="test",
            reason="duplicate correction",
        )


def test_synthetic_restrictions_and_scenario_isolation(db):
    args = context(db, synthetic=True)
    production = db.scalar(select(s.world.c.id).where(s.world.c.name == "production"))
    for changes in ({"world_id": production}, {"epistemic_class": "OBSERVED"}):
        with pytest.raises(DBAPIError), db.begin_nested():
            create_fact(db, "observation", FactCreate(**{**args, **changes}))
    row = create_fact(db, "observation", FactCreate(**args))
    with pytest.raises(ValueError):
        build_snapshot(
            db,
            entity_id=args["subject_entity_id"],
            world_id=production,
            as_of=AS_OF,
            inputs=[{"kind": "observation", "id": row["id"]}],
        )


def test_provenance_pair_must_match(db):
    args = context(db)
    other = insert_row(db, s.source, source_type="interview", title="Unrelated source")
    with pytest.raises(DBAPIError), db.begin_nested():
        create_fact(db, "observation", FactCreate(**{**args, "source_id": other["id"]}))


def test_aliases_suggest_without_merging(db):
    source = insert_row(db, s.source, source_type="registry", title="Two source records")
    for name in ("Shanglong", "Shang Long"):
        entity = insert_row(db, s.entity, entity_type="organisation", canonical_name=name)
        insert_row(
            db,
            s.entity_alias,
            entity_id=entity["id"],
            alias="Shanglong Industry Company",
            source_id=source["id"],
            resolution_method="explicit_source_alias",
        )
    assert len(alias_candidates(db, "Shanglong Industry Company")) == 2
    assert alias_candidates(db, "Shanglon") == []


def test_processor_import_raw_and_idempotency(db, store):
    importer = MarketImporter(db, store)
    report = importer.import_file(DATA_ROOT / "processors.json", only="Shanglong Industry Company")
    assert len(report["records"]) == 1
    ingest = (
        db.execute(select(s.raw_ingest).where(s.raw_ingest.c.id == report["raw_ingest_id"]))
        .mappings()
        .one()
    )
    assert store.get(ingest["artifact_uri"]) == (DATA_ROOT / "processors.json").read_bytes()
    geom = db.execute(
        select(s.geometry_observation.c.method, func.ST_X(s.geometry_observation.c.geometry))
    ).first()
    assert geom[0] == "reported_coordinate" and abs(geom[1] - 31.6226227) < 1e-8
    assert importer.import_file(DATA_ROOT / "processors.json", only="Shanglong Industry Company")[
        "already_imported"
    ]
    assert (
        db.scalar(
            select(func.count())
            .select_from(s.assertion)
            .where(s.assertion.c.missingness == "NOT_REPORTED")
        )
        > 0
    )


def test_cfr_import_preserves_raw_kml_metadata_and_quarantines_dummy(db, store):
    report = MarketImporter(db, store).import_file(
        DATA_ROOT / "central-forest-reserves.json", only="Lodonga"
    )
    world_id = report["records"][0]["world_id"]
    assert db.scalar(select(s.world.c.kind).where(s.world.c.id == world_id)) == "experiment"
    raw = db.scalar(
        select(s.evidence_item.c.raw_record).where(
            s.evidence_item.c.raw_ingest_id == report["raw_ingest_id"]
        )
    )
    assert raw["Source fields"]["COL566320D712B03370"] == "1.07028795716"
    assert db.scalar(select(s.geometry_observation.c.method)) == "centroid_estimate"


def test_demo_price_history_lineage_and_model_effect(db, store):
    result = demonstrate(db, store)
    assert result["old_price_ugx_per_tonne"] == 125000
    assert result["new_price_ugx_per_tonne"] == 140000
    assert result["G1_tonnes_before"] > result["G1_tonnes_after"]
    assert result["initial_snapshot_id"] != result["current_snapshot_id"]
    assert result["explanation"]["posterior"]["parent_snapshot_id"] is not None
    assert any(x["kind"] == "observation" for x in result["explanation"]["inputs"])
    db.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))


def test_snapshot_requires_lineage_and_is_sealed(db, store):
    args = context(db)
    create_fact(db, "observation", FactCreate(**args))
    state = build_snapshot(
        db, entity_id=args["subject_entity_id"], world_id=args["world_id"], as_of=AS_OF, store=store
    )
    posterior = (
        db.execute(
            select(s.posterior_snapshot).where(
                s.posterior_snapshot.c.id == state["posterior_snapshot_id"]
            )
        )
        .mappings()
        .one()
    )
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(
            update(s.state_snapshot)
            .where(s.state_snapshot.c.id == state["id"])
            .values(summary={"invented": 1})
        )
    with pytest.raises(DBAPIError), db.begin_nested():
        insert_row(
            db,
            s.posterior_snapshot,
            entity_id=args["subject_entity_id"],
            world_id=args["world_id"],
            model_version_id=state["model_version_id"],
            model_run_id=posterior["model_run_id"],
            state_type="invalid",
        )
        db.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))


def test_migration_roundtrip(database_engine):
    # Every db fixture rolls its business data back. This database is exclusively *_test.
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    with database_engine.connect() as connection:
        assert (
            connection.scalar(
                text("SELECT count(*) FROM information_schema.tables WHERE table_schema='belief'")
            )
            >= 5
        )


def test_delete_rebuild_keeps_evidence_and_run(db, store):
    args = context(db)
    observation = create_fact(db, "observation", FactCreate(**args))
    state = build_snapshot(
        db, entity_id=args["subject_entity_id"], world_id=args["world_id"], as_of=AS_OF, store=store
    )
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(
            delete(s.snapshot_input).where(
                s.snapshot_input.c.posterior_snapshot_id == state["posterior_snapshot_id"]
            )
        )
    run_id = delete_derived_bundle(db, state["id"])
    assert db.scalar(select(s.observation.c.id).where(s.observation.c.id == observation["id"]))
    rebuilt = rebuild_from_run(db, run_id, store)
    assert rebuilt["summary"] == state["summary"]
    assert rebuilt["id"] != state["id"]


def test_polygon_and_display_offset_read_model(db):
    args = context(db)
    fields = {k: args[k] for k in ("world_id", "source_id", "evidence_item_id")}
    real = insert_row(
        db,
        s.geometry_observation,
        entity_id=args["subject_entity_id"],
        geometry="SRID=4326;POLYGON((31 1,31.1 1,31.1 1.1,31 1.1,31 1))",
        method="surveyed",
        precision_m=2,
        precision_description="Survey uncertainty: 2 m",
        **fields,
    )
    insert_row(
        db,
        s.geometry_observation,
        entity_id=args["subject_entity_id"],
        geometry="SRID=4326;POINT(31.2 1.2)",
        method="display_offset",
        precision_description="Display only",
        **fields,
    )
    assert (
        db.scalar(
            text("SELECT id FROM geo.latest_entity_geometry WHERE entity_id=:entity"),
            {"entity": args["subject_entity_id"]},
        )
        == real["id"]
    )


def test_direct_sql_cross_world_model_reference_rejected(db, store):
    args = context(db, synthetic=True)
    create_fact(db, "observation", FactCreate(**args))
    state = build_snapshot(
        db, entity_id=args["subject_entity_id"], world_id=args["world_id"], as_of=AS_OF, store=store
    )
    production = db.scalar(select(s.world.c.id).where(s.world.c.name == "production"))
    with pytest.raises(DBAPIError), db.begin_nested():
        insert_row(
            db,
            s.model_run,
            model_version_id=state["model_version_id"],
            world_id=production,
            input_state_snapshot_id=state["id"],
            status="pending",
        )


def test_price_read_model_follows_supersession(db, store):
    result = demonstrate(db, store)
    prices = (
        db.execute(text("SELECT amount FROM market.latest_price WHERE amount=140000"))
        .scalars()
        .all()
    )
    assert prices == [140000]
    initial_invalidations = db.scalar(
        select(func.count())
        .select_from(s.invalidation)
        .where(s.invalidation.c.state_snapshot_id == result["initial_snapshot_id"])
    )
    assert initial_invalidations >= 2


def test_synthetic_geometry_cannot_be_relabelled_into_production(db):
    args = context(db, synthetic=True)
    production = db.scalar(select(s.world.c.id).where(s.world.c.name == "production"))
    with pytest.raises(DBAPIError), db.begin_nested():
        insert_row(
            db,
            s.geometry_observation,
            entity_id=args["subject_entity_id"],
            world_id=production,
            source_id=args["source_id"],
            evidence_item_id=args["evidence_item_id"],
            geometry="SRID=4326;POINT(31 1)",
            method="gps",
            precision_description="Cannot promote synthetic source geometry",
        )


def test_explicit_synthetic_permission_requires_reason(db):
    for reason in (None, "", " "):
        with pytest.raises(DBAPIError), db.begin_nested():
            insert_row(
                db,
                s.world,
                name=f"invalid-permission-{reason}",
                kind="production",
                allow_synthetic=True,
                synthetic_permission_reason=reason,
            )


def test_verification_cost_requires_currency(db):
    args = context(db)
    with pytest.raises(DBAPIError), db.begin_nested():
        insert_row(
            db,
            s.verification_task,
            world_id=args["world_id"],
            target_entity_id=args["subject_entity_id"],
            reason="Costed sampling plan",
            estimated_cost=100,
        )
