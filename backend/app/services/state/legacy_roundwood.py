"""Canonical processor state -> unchanged legacy grade-yield model.

Manual stand distributions are scenario assumptions. This adapter does not infer
stumpage, invent missing buyer grades, convert currencies, or call live routing.
"""

import json
from pathlib import Path

from sqlalchemy import select, text, update

from app.db import schema as s
from app.schemas import RoundwoodProductionRequest
from app.services import roundwood_production as legacy
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.state.registry import audit_context, insert_row, register_model
from app.services.state.snapshots import json_default


def threshold_overrides(session, snapshot, species: str):
    genus = "Eucalyptus" if species == "euc" else "Pinus"
    grades = session.execute(
        select(s.grade_definition.c.entity_id, s.grade_definition.c.code)
        .join(s.taxon, s.grade_definition.c.taxon_id == s.taxon.c.id)
        .join(
            s.procurement_programme,
            s.grade_definition.c.procurement_programme_id == s.procurement_programme.c.id,
        )
        .join(s.facility, s.procurement_programme.c.facility_id == s.facility.c.id)
        .where(s.facility.c.entity_id == snapshot["entity_id"], s.taxon.c.scientific_name == genus)
    ).all()
    by_entity = {str(entity_id): code for entity_id, code in grades}
    overrides = {}
    for value in snapshot["summary"].get("values", []):
        grade = by_entity.get(value["subject_entity_id"])
        if grade not in ("g1", "g2", "g3") or value["missingness"]:
            continue
        key = value["variable"]
        if key == "processor.grade.legacy_min_dbh":
            overrides[f"{grade}_dbh_min"] = float(value["value"])
        elif key == "processor.grade.min_length":
            overrides[f"{grade}_h_min"] = float(value["value"])
        elif key == "processor.grade.min_sed":
            raise ValueError("Legacy model grades tree DBH; log SED requires a bucking adapter")
    return overrides


def run_from_snapshot(
    session,
    snapshot_id,
    payload: RoundwoodProductionRequest,
    *,
    assumed_missing_thresholds: dict[str, float] | None = None,
    store=None,
):
    audit_context(
        session,
        "roundwood-state-adapter",
        "Evaluate legacy grade yields against pinned processor state",
    )
    snapshot = (
        session.execute(select(s.state_snapshot).where(s.state_snapshot.c.id == snapshot_id))
        .mappings()
        .one()
    )
    world = (
        session.execute(select(s.world).where(s.world.c.id == snapshot["world_id"]))
        .mappings()
        .one()
    )
    if world["kind"] == "production":
        raise ValueError(
            "Manual stand assumptions require a scenario/experiment snapshot; production supply-state adapter is not implemented"
        )
    overrides = threshold_overrides(session, snapshot, payload.species)
    required = {f"{g}_{field}" for g in ("g1", "g2", "g3") for field in ("dbh_min", "h_min")}
    missing = required - overrides.keys()
    assumptions = assumed_missing_thresholds or {}
    if set(assumptions) != missing:
        raise ValueError(
            f"Explicit scenario assumptions required for exactly these missing thresholds: {sorted(missing)}"
        )
    scenario_payload = RoundwoodProductionRequest.model_validate(
        {**payload.model_dump(), **assumptions, **overrides}
    )
    scenario = legacy._scenario_from_payload(scenario_payload)
    store = store or LocalArtifactStore()
    version = register_model(
        session,
        "roundwood.grade-yields",
        Path(legacy.__file__),
        "Legacy grade-yield simulation with canonical buyer thresholds",
        store,
    )
    run = insert_row(
        session,
        s.model_run,
        model_version_id=version["id"],
        world_id=snapshot["world_id"],
        input_state_snapshot_id=snapshot_id,
        rng_seed=scenario_payload.rng_seed,
        status="running",
        inputs={
            "legacy_payload": scenario_payload.model_dump(mode="json"),
            "processor_snapshot_id": str(snapshot_id),
        },
        configuration={
            "adapter_version": "0.1",
            "missing_threshold_assumptions": assumptions,
            "stand_epistemic_class": "SCENARIO",
            "component": "simulate_grade_yields",
            "density_unit": "tonne/m3",
            "density_is_model_input": True,
        },
        model_discrepancy={
            "status": "not_estimated",
            "note": "Legacy tree-DBH grading is not a log-bucking model",
        },
    )
    result = legacy.simulate_grade_yields(
        scenario,
        form_factor=scenario_payload.form_factor,
        n_draws=scenario_payload.n_draws,
        rng_seed=scenario_payload.rng_seed,
    )
    uri, _ = store.put(
        json.dumps(
            {"model_run_id": run["id"], "state_snapshot_id": snapshot_id, "result": result},
            default=json_default,
            sort_keys=True,
        ).encode()
    )
    session.execute(
        update(s.model_run)
        .where(s.model_run.c.id == run["id"])
        .values(
            status="completed",
            completed_at=session.scalar(text("SELECT clock_timestamp()")),
            artifact_uri=uri,
            diagnostics={"grade_tonnes": result["T_del_by_grade"]},
        )
    )
    return {
        "model_run_id": run["id"],
        "state_snapshot_id": snapshot_id,
        "world_id": snapshot["world_id"],
        "model_version_id": version["id"],
        "artifact_uri": uri,
        "result": result,
    }
