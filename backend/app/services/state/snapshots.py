import json
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from uuid import UUID

from sqlalchemy import delete, select, text, update

from app.db import schema as s
from app.domain.values import visible_at
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.state.facts import FACT_TABLES, temporal_query
from app.services.state.registry import audit_context, insert_row, register_model


def json_default(value):
    if isinstance(value, (UUID, Decimal)):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Cannot serialize {type(value)}")


def scope_entities(session, entity_id):
    """Facility and its procurement grades; otherwise the explicitly supplied entity."""
    grades = session.scalars(
        select(s.grade_definition.c.entity_id)
        .join(
            s.procurement_programme,
            s.grade_definition.c.procurement_programme_id == s.procurement_programme.c.id,
        )
        .join(s.facility, s.procurement_programme.c.facility_id == s.facility.c.id)
        .where(s.facility.c.entity_id == entity_id)
    ).all()
    return [entity_id, *grades]


def select_inputs(session, entity_id, world_id, as_of, known_at):
    """Deterministic recency selection, explicitly not Bayesian or source verification.

    All competitors remain in history. The output exposes their IDs as diagnostics.
    Clients can provide explicit inputs when a recency rule is inappropriate.
    """
    subjects = scope_entities(session, entity_id)
    candidates = []
    for kind, table in FACT_TABLES.items():
        rows = session.execute(
            temporal_query(table, valid_at=as_of, known_at=known_at).where(
                table.c.subject_entity_id.in_(subjects),
                table.c.world_id == world_id,
                table.c.quality_status != "rejected",
            )
        ).mappings()
        candidates.extend((kind, dict(row)) for row in rows)
    selected = {}
    alternatives = {}
    for kind, row in sorted(candidates, key=lambda x: (x[1]["recorded_at"], str(x[1]["id"]))):
        key = (row["subject_entity_id"], row["variable_definition_id"])
        if key in selected:
            alternatives.setdefault(str(key), []).append(str(selected[key][1]["id"]))
        selected[key] = (kind, row)
    return [{"kind": kind, "id": row["id"]} for kind, row in selected.values()], alternatives


def build_snapshot(
    session,
    *,
    entity_id,
    world_id,
    as_of,
    known_at=None,
    inputs=None,
    parent_snapshot_id=None,
    actor="state-service",
    reason="Select state from available evidence",
    store=None,
):
    audit_context(session, actor, reason)
    store = store or LocalArtifactStore()
    now = session.scalar(text("SELECT clock_timestamp()"))
    known_at = known_at or now
    if known_at > now:
        raise ValueError("Knowledge cutoff cannot be in the future")
    if as_of.tzinfo is None or known_at.tzinfo is None:
        raise ValueError("Temporal queries require timezone-aware timestamps")
    alternatives = {}
    explicit = inputs is not None
    if inputs is None:
        inputs, alternatives = select_inputs(session, entity_id, world_id, as_of, known_at)
    if not inputs:
        raise ValueError("Cannot infer state without explicit evidence lineage")
    if parent_snapshot_id:
        parent = (
            session.execute(
                select(s.posterior_snapshot).where(s.posterior_snapshot.c.id == parent_snapshot_id)
            )
            .mappings()
            .one()
        )
        if parent["world_id"] != world_id or parent["entity_id"] != entity_id:
            raise ValueError("Parent posterior must share world and scope")
    values, lineage, seen = [], [], set()
    subjects = scope_entities(session, entity_id)
    for item in inputs:
        kind = item["kind"]
        table = s.geometry_observation if kind == "geometry_observation" else FACT_TABLES[kind]
        row = session.execute(select(table).where(table.c.id == item["id"])).mappings().one()
        subject = row["entity_id"] if kind == "geometry_observation" else row["subject_entity_id"]
        if row["world_id"] != world_id or subject not in subjects:
            raise ValueError("Input is outside snapshot world or entity scope")
        if not visible_at(dict(row), as_of, known_at):
            raise ValueError("Input was not visible at the selected validity/knowledge times")
        if kind != "geometry_observation":
            if row["quality_status"] == "rejected":
                raise ValueError("Rejected evidence cannot enter inference")
            key = (subject, row["variable_definition_id"])
            if key in seen:
                raise ValueError(
                    "Choose one value per subject/variable; conflicting inputs require a separate inference model"
                )
            seen.add(key)
            variable = (
                session.execute(
                    select(s.variable_definition).where(
                        s.variable_definition.c.id == row["variable_definition_id"]
                    )
                )
                .mappings()
                .one()
            )
            value = row[f"{variable['data_type']}_value"]
            values.append(
                {
                    "subject_entity_id": str(subject),
                    "variable": variable["key"],
                    "value": str(value) if isinstance(value, Decimal) else value,
                    "unit": row["unit"],
                    "missingness": row["missingness"],
                    "epistemic_class": row["epistemic_class"],
                    "uncertainty": row["uncertainty"],
                    "input_kind": kind,
                    "input_id": str(row["id"]),
                    "valid_time_unknown": row["valid_from"] is None,
                    "quality_status": row["quality_status"],
                }
            )
        lineage.append({f"{kind}_id": row["id"]})
    version = register_model(
        session,
        "canonical.selected-evidence",
        Path(__file__),
        "Deterministic selected-evidence snapshot; no Bayesian updating",
        store,
    )
    configuration = {
        "policy": "explicit_selection" if explicit else "latest_recorded_per_subject_variable",
        "as_of": as_of.isoformat(),
        "known_at": known_at.isoformat(),
        "scope_entity_id": str(entity_id),
        "alternatives": alternatives,
    }
    run = insert_row(
        session,
        s.model_run,
        model_version_id=version["id"],
        world_id=world_id,
        status="running",
        configuration=configuration,
        inputs={"facts": [{"kind": item["kind"], "id": str(item["id"])} for item in inputs]},
        measurement_noise={"source": "per-observation uncertainty"},
        model_discrepancy={
            "status": "not_estimated",
            "reason": "Selection only; no calibrated measurement model",
        },
    )
    summary = {"method": "selected_evidence_v0.1", "bayesian_update": False, "values": values}
    manifest = {
        "configuration": configuration,
        "summary": summary,
        "lineage": lineage,
        "model_version_id": version["id"],
        "model_run_id": run["id"],
        "world_id": world_id,
    }
    uri, _ = store.put(json.dumps(manifest, default=json_default, sort_keys=True).encode())
    posterior = insert_row(
        session,
        s.posterior_snapshot,
        entity_id=entity_id,
        world_id=world_id,
        parent_snapshot_id=parent_snapshot_id,
        model_version_id=version["id"],
        model_run_id=run["id"],
        state_type="selected_evidence",
        summary=summary,
        artifact_uri=uri,
        diagnostics={
            "alternatives": alternatives,
            "uncertainty": "No invented posterior intervals",
        },
    )
    for item in lineage:
        insert_row(session, s.snapshot_input, posterior_snapshot_id=posterior["id"], **item)
        insert_row(session, s.run_input, model_run_id=run["id"], **item)
    state = insert_row(
        session,
        s.state_snapshot,
        entity_id=entity_id,
        world_id=world_id,
        posterior_snapshot_id=posterior["id"],
        model_version_id=version["id"],
        state_type="selected_evidence",
        as_of=as_of,
        known_at=known_at,
        summary=summary,
        artifact_uri=uri,
    )
    session.execute(
        update(s.model_run)
        .where(s.model_run.c.id == run["id"])
        .values(
            status="completed",
            completed_at=session.scalar(text("SELECT clock_timestamp()")),
            artifact_uri=uri,
        )
    )
    return state


def explain_snapshot(session, snapshot_id):
    state = (
        session.execute(select(s.state_snapshot).where(s.state_snapshot.c.id == snapshot_id))
        .mappings()
        .one_or_none()
    )
    if not state:
        raise ValueError("Snapshot not found")
    posterior = (
        session.execute(
            select(s.posterior_snapshot).where(
                s.posterior_snapshot.c.id == state["posterior_snapshot_id"]
            )
        )
        .mappings()
        .one()
    )
    version = (
        session.execute(
            select(s.model_version).where(s.model_version.c.id == state["model_version_id"])
        )
        .mappings()
        .one()
    )
    run = (
        session.execute(select(s.model_run).where(s.model_run.c.id == posterior["model_run_id"]))
        .mappings()
        .one()
    )
    inputs = []
    for link in session.execute(
        select(s.snapshot_input).where(s.snapshot_input.c.posterior_snapshot_id == posterior["id"])
    ).mappings():
        for kind, table in {**FACT_TABLES, "geometry_observation": s.geometry_observation}.items():
            if not link[f"{kind}_id"]:
                continue
            fact = dict(
                session.execute(select(table).where(table.c.id == link[f"{kind}_id"]))
                .mappings()
                .one()
            )
            evidence = (
                session.execute(
                    select(s.evidence_item).where(s.evidence_item.c.id == fact["evidence_item_id"])
                )
                .mappings()
                .one()
            )
            source = (
                session.execute(select(s.source).where(s.source.c.id == fact["source_id"]))
                .mappings()
                .one()
            )
            for name in ("geometry", "valid_period", "knowledge_period"):
                fact.pop(name, None)
            inputs.append(
                {
                    "kind": kind,
                    "fact": fact,
                    "evidence": {
                        "id": evidence["id"],
                        "content_hash": evidence["content_hash"],
                        "raw_ingest_id": evidence["raw_ingest_id"],
                        "locator": evidence["locator"] if source["access"] == "public" else None,
                    },
                    "source": {
                        "id": source["id"],
                        "access": source["access"],
                        "title": source["title"]
                        if source["access"] == "public"
                        else "Restricted source",
                        "data_vintage": source["data_vintage"],
                    },
                }
            )
    return {
        "state": dict(state),
        "posterior": dict(posterior),
        "model_version": dict(version),
        "model_run": dict(run),
        "inputs": inputs,
        "invalidations": [
            dict(x)
            for x in session.execute(
                select(s.invalidation).where(s.invalidation.c.state_snapshot_id == snapshot_id)
            ).mappings()
        ],
    }


def rebuild_snapshot(session, snapshot_id, store=None):
    """Verify manifest integrity and rebuild from immutable source inputs, using the same code version.

    If historical code differs, refuse to rerun it under current code. The original
    manifest remains recoverable and executable with its archived version.
    """
    state = (
        session.execute(select(s.state_snapshot).where(s.state_snapshot.c.id == snapshot_id))
        .mappings()
        .one()
    )
    posterior = (
        session.execute(
            select(s.posterior_snapshot).where(
                s.posterior_snapshot.c.id == state["posterior_snapshot_id"]
            )
        )
        .mappings()
        .one()
    )
    run = (
        session.execute(select(s.model_run).where(s.model_run.c.id == posterior["model_run_id"]))
        .mappings()
        .one()
    )
    store = store or LocalArtifactStore()
    manifest = json.loads(store.get(state["artifact_uri"]))
    version = register_model(
        session,
        "canonical.selected-evidence",
        Path(__file__),
        "Deterministic selected-evidence snapshot",
        store,
    )
    if version["id"] != state["model_version_id"]:
        raise ValueError("Historical model code differs; use its archived version")
    inputs = [{"kind": item["kind"], "id": UUID(item["id"])} for item in run["inputs"]["facts"]]
    rebuilt = build_snapshot(
        session,
        entity_id=state["entity_id"],
        world_id=state["world_id"],
        as_of=state["as_of"],
        known_at=state["known_at"],
        inputs=inputs,
        store=store,
    )
    if rebuilt["summary"] != manifest["summary"]:
        raise ValueError("Rebuilt state does not match archived manifest")
    return rebuilt


def delete_derived_bundle(session, snapshot_id):
    """Delete an unreferenced derived leaf, retaining its run, inputs, artifacts and audit.

    References from decisions, newer posteriors or downstream model runs intentionally
    prevent deletion. The caller controls the transaction, so failed deletion rolls back.
    """
    audit_context(session, "state-maintenance", "Remove rebuildable derived state bundle")
    row = (
        session.execute(
            select(s.state_snapshot).where(s.state_snapshot.c.id == snapshot_id).with_for_update()
        )
        .mappings()
        .one()
    )
    posterior = (
        session.execute(
            select(s.posterior_snapshot).where(
                s.posterior_snapshot.c.id == row["posterior_snapshot_id"]
            )
        )
        .mappings()
        .one()
    )
    session.execute(delete(s.state_snapshot).where(s.state_snapshot.c.id == snapshot_id))
    session.execute(
        delete(s.posterior_snapshot).where(
            s.posterior_snapshot.c.id == row["posterior_snapshot_id"]
        )
    )
    return posterior["model_run_id"]


def rebuild_from_run(session, model_run_id, store=None):
    """Reconstruct after snapshot deletion; original run lineage is durable."""
    audit_context(session, "state-maintenance", "Rebuild from durable run lineage")
    store = store or LocalArtifactStore()
    run = (
        session.execute(select(s.model_run).where(s.model_run.c.id == model_run_id))
        .mappings()
        .one()
    )
    version = register_model(
        session,
        "canonical.selected-evidence",
        Path(__file__),
        "Deterministic selected-evidence snapshot",
        store,
    )
    if version["id"] != run["model_version_id"]:
        raise ValueError("Rebuild requires the original archived model version")
    manifest = json.loads(store.get(run["artifact_uri"]))
    config = run["configuration"]
    inputs = [{"kind": item["kind"], "id": UUID(item["id"])} for item in run["inputs"]["facts"]]
    rebuilt = build_snapshot(
        session,
        entity_id=UUID(config["scope_entity_id"]),
        world_id=run["world_id"],
        as_of=datetime.fromisoformat(config["as_of"]),
        known_at=datetime.fromisoformat(config["known_at"]),
        inputs=inputs,
        store=store,
    )
    if rebuilt["summary"] != manifest["summary"]:
        raise ValueError("Rebuild differs from archived state")
    return rebuilt
