"""Deterministic acceptance workflow using the real repository's first processor."""

from datetime import UTC, datetime

from sqlalchemy import select, text

from app.db import schema as s
from app.domain.values import FactCreate
from app.schemas import RoundwoodProductionRequest
from app.services.ingestion.market_databases import DATA_ROOT, MarketImporter
from app.services.state.facts import create_fact, supersede_fact, temporal_query
from app.services.state.legacy_roundwood import run_from_snapshot
from app.services.state.registry import audit_context, insert_row
from app.services.state.snapshots import build_snapshot, explain_snapshot, rebuild_snapshot


def demonstrate(session, store=None):
    importer = MarketImporter(session, store)
    imported = importer.import_file(
        DATA_ROOT / "processors.json", only="Shanglong Industry Company"
    )
    if imported["already_imported"]:
        raise ValueError("Demo needs a fresh database; use the documented disposable demo database")
    processor = imported["records"][0]
    as_of = datetime(2026, 7, 15, tzinfo=UTC)
    initial = build_snapshot(
        session,
        entity_id=processor["entity_id"],
        world_id=processor["world_id"],
        as_of=as_of,
        store=store,
    )
    audit_context(
        session, "canonical-demo", "Synthetic threshold and price changes in an experiment world"
    )
    source = insert_row(
        session,
        s.source,
        source_type="synthetic_field_campaign",
        title="Canonical acceptance experiment",
        data_class="SYNTHETIC",
        access="restricted",
        metadata={"warning": "Synthetic test observations, not market intelligence"},
    )
    evidence = insert_row(
        session,
        s.evidence_item,
        source_id=source["id"],
        kind="synthetic_measurement",
        locator={"campaign": "canonical-v0.1-demo"},
        raw_record={"g1_legacy_dbh_min_cm": 40, "g1_price_ugx_per_tonne": 140000},
    )
    old_value = next(
        x
        for x in initial["summary"]["values"]
        if x["variable"] == "processor.grade.legacy_min_dbh" and x["value"] == "30"
    )
    new_observation = create_fact(
        session,
        "observation",
        FactCreate(
            subject_entity_id=old_value["subject_entity_id"],
            variable_key="processor.grade.legacy_min_dbh",
            numeric_value=40,
            unit="cm",
            world_id=processor["world_id"],
            source_id=source["id"],
            evidence_item_id=evidence["id"],
            epistemic_class="SYNTHETIC",
            method="synthetic_threshold_verification",
            observed_at=as_of,
            valid_from=datetime(2026, 7, 1, tzinfo=UTC),
        ),
        reason="Synthetic observed G1 threshold change",
    )
    old_price = (
        session.execute(
            select(s.assertion).where(
                s.assertion.c.subject_entity_id == new_observation["subject_entity_id"],
                s.assertion.c.unit == "UGX/tonne",
            )
        )
        .mappings()
        .one()
    )
    new_price = supersede_fact(
        session,
        "assertion",
        old_price["id"],
        FactCreate(
            subject_entity_id=new_observation["subject_entity_id"],
            variable_key="market.roundwood.price.ugx_per_tonne",
            numeric_value=140000,
            unit="UGX/tonne",
            world_id=processor["world_id"],
            source_id=source["id"],
            evidence_item_id=evidence["id"],
            epistemic_class="SYNTHETIC",
            method="synthetic_price_interview",
            valid_from=datetime(2026, 7, 1, tzinfo=UTC),
        ),
        actor="canonical-demo",
        reason="Price effective July 1, learned at demo execution",
    )
    current = build_snapshot(
        session,
        entity_id=processor["entity_id"],
        world_id=processor["world_id"],
        as_of=as_of,
        parent_snapshot_id=initial["posterior_snapshot_id"],
        store=store,
    )
    rebuilt = rebuild_snapshot(session, initial["id"], store)
    manual = RoundwoodProductionRequest(lon=31.5, lat=1.0, n_draws=1000, rng_seed=7)
    assumptions = {"g2_dbh_min": 20, "g2_h_min": 2.7, "g3_dbh_min": 15, "g3_h_min": 2.7}
    before = run_from_snapshot(
        session, initial["id"], manual, assumed_missing_thresholds=assumptions, store=store
    )
    after = run_from_snapshot(
        session, current["id"], manual, assumed_missing_thresholds=assumptions, store=store
    )
    if before["result"]["T_del_by_grade"]["G1"] <= after["result"]["T_del_by_grade"]["G1"]:
        raise AssertionError(
            "Stricter G1 threshold should reduce G1 tonnes for the fixed random draw"
        )
    known_now = session.scalar(text("SELECT clock_timestamp()"))
    before_price = (
        session.execute(
            temporal_query(s.assertion, valid_at=as_of, known_at=initial["known_at"]).where(
                s.assertion.c.id == old_price["id"]
            )
        )
        .mappings()
        .one()
    )
    current_price = (
        session.execute(
            temporal_query(s.assertion, valid_at=as_of, known_at=known_now).where(
                s.assertion.c.id == new_price["id"]
            )
        )
        .mappings()
        .one()
    )
    return {
        "synthetic_experiment": True,
        "raw_ingest_id": imported["raw_ingest_id"],
        "entity_id": processor["entity_id"],
        "world_id": processor["world_id"],
        "initial_snapshot_id": initial["id"],
        "current_snapshot_id": current["id"],
        "rebuilt_snapshot_id": rebuilt["id"],
        "old_price_ugx_per_tonne": before_price["numeric_value"],
        "new_price_ugx_per_tonne": current_price["numeric_value"],
        "new_observation_id": new_observation["id"],
        "G1_tonnes_before": before["result"]["T_del_by_grade"]["G1"],
        "G1_tonnes_after": after["result"]["T_del_by_grade"]["G1"],
        "before_model_run_id": before["model_run_id"],
        "after_model_run_id": after["model_run_id"],
        "explanation": explain_snapshot(session, current["id"]),
    }
