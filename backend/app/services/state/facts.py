from datetime import datetime
from uuid import UUID

from sqlalchemy import select, text, update

from app.db import schema as s
from app.domain.units import convert
from app.domain.values import FactCreate
from app.services.state.registry import audit_context, insert_row

FACT_TABLES = {"observation": s.observation, "assertion": s.assertion}


def resolve_variable(session, key: str):
    row = (
        session.execute(select(s.variable_definition).where(s.variable_definition.c.key == key))
        .mappings()
        .first()
    )
    if not row:
        row = (
            session.execute(
                select(s.variable_definition)
                .join(
                    s.variable_alias,
                    s.variable_alias.c.variable_definition_id == s.variable_definition.c.id,
                )
                .where(s.variable_alias.c.alias == key)
            )
            .mappings()
            .first()
        )
    if not row:
        raise ValueError(f"Unregistered canonical variable: {key}")
    return dict(row)


def create_fact(
    session,
    kind: str,
    payload: FactCreate,
    *,
    actor="canonical-service",
    reason="Record source evidence",
    _recorded_at=None,
):
    audit_context(session, actor, reason)
    table = FACT_TABLES[kind]
    variable = resolve_variable(session, payload.variable_key)
    values = payload.model_dump(mode="python", exclude={"variable_key", "uncertainty"})
    values["uncertainty"] = payload.uncertainty.model_dump(mode="json", exclude_none=True)
    if payload.numeric_value is not None:
        if variable["data_type"] != "numeric":
            raise ValueError("Variable requires a different value type")
        values["numeric_value"] = convert(
            payload.numeric_value, payload.unit, variable["canonical_unit"]
        )
        # Uncertainty quantities have the same scale as the measured value.
        for key in (
            "lower",
            "upper",
            "standard_error",
            "standard_deviation",
            "measurement_precision",
        ):
            if key in values["uncertainty"]:
                values["uncertainty"][key] = float(
                    convert(values["uncertainty"][key], payload.unit, variable["canonical_unit"])
                )
        values["unit"] = variable["canonical_unit"]
    elif payload.missingness:
        values["unit"] = variable["canonical_unit"]
    elif getattr(payload, f"{variable['data_type']}_value") is None:
        raise ValueError("Value type does not match canonical variable")
    values["variable_definition_id"] = variable["id"]
    if _recorded_at is not None:
        values["recorded_at"] = _recorded_at
    row = insert_row(session, table, **values)
    project_market_fact(session, kind, row, variable["key"])
    # Every later fact may affect previous results, even when it does not replace a selected fact.
    affected = []
    for input_kind, input_table in FACT_TABLES.items():
        affected.extend(
            session.scalars(
                select(s.state_snapshot.c.id)
                .join(
                    s.posterior_snapshot,
                    s.state_snapshot.c.posterior_snapshot_id == s.posterior_snapshot.c.id,
                )
                .join(
                    s.snapshot_input,
                    s.snapshot_input.c.posterior_snapshot_id == s.posterior_snapshot.c.id,
                )
                .join(input_table, s.snapshot_input.c[f"{input_kind}_id"] == input_table.c.id)
                .where(
                    input_table.c.subject_entity_id == payload.subject_entity_id,
                    input_table.c.variable_definition_id == variable["id"],
                    s.state_snapshot.c.world_id == payload.world_id,
                )
            ).all()
        )
    for snapshot_id in set(affected):
        insert_row(
            session,
            s.invalidation,
            state_snapshot_id=snapshot_id,
            **{f"{kind}_id": row["id"]},
            reason=reason,
        )
    return row


def temporal_query(table, *, valid_at: datetime, known_at: datetime):
    return select(table).where(
        table.c.valid_period.op("@>")(valid_at), table.c.knowledge_period.op("@>")(known_at)
    )


def supersede_fact(
    session, kind: str, old_id: UUID, replacement: FactCreate, *, actor: str, reason: str
):
    """Close knowledge once and split the real-world interval without changing old values.

    Replacement may cover all or part of the old interval. Carry-forward records
    preserve the old claim outside that interval under the newly acquired knowledge.
    Concurrent replacement attempts serialize on the old row.
    """
    audit_context(session, actor, reason)
    table = FACT_TABLES[kind]
    old = (
        session.execute(select(table).where(table.c.id == old_id).with_for_update())
        .mappings()
        .one_or_none()
    )
    if not old:
        raise ValueError("Original fact does not exist")
    if old["superseded_at"] is not None:
        raise ValueError("Fact has already been superseded")
    variable = resolve_variable(session, replacement.variable_key)
    if any(
        old[field] != value
        for field, value in {
            "subject_entity_id": replacement.subject_entity_id,
            "world_id": replacement.world_id,
            "variable_definition_id": variable["id"],
        }.items()
    ):
        raise ValueError("Supersession must keep subject, variable, and world")
    start, end = replacement.valid_from, replacement.valid_to
    if old["valid_from"] and (start is None or start < old["valid_from"]):
        raise ValueError("Replacement starts outside original validity")
    if old["valid_to"] and (end is None or end > old["valid_to"]):
        raise ValueError("Replacement ends outside original validity")
    learned_at = session.scalar(text("SELECT clock_timestamp()"))
    session.execute(update(table).where(table.c.id == old_id).values(superseded_at=learned_at))
    retained = {
        key: value
        for key, value in old.items()
        if key not in ("id", "recorded_at", "superseded_at", "valid_period", "knowledge_period")
    }
    retained["metadata"] = {**old["metadata"], "carried_from": str(old_id)}
    if start is not None and (old["valid_from"] is None or start > old["valid_from"]):
        carry = insert_row(
            session, table, **{**retained, "valid_to": start, "recorded_at": learned_at}
        )
        project_market_fact(session, kind, carry, variable["key"])
    if end is not None and (old["valid_to"] is None or end < old["valid_to"]):
        carry = insert_row(
            session, table, **{**retained, "valid_from": end, "recorded_at": learned_at}
        )
        project_market_fact(session, kind, carry, variable["key"])
    new = create_fact(
        session, kind, replacement, actor=actor, reason=reason, _recorded_at=learned_at
    )
    insert_row(
        session,
        s.change_event,
        table_name=f"observations.{kind}",
        record_id=new["id"],
        action="supersession",
        actor=actor,
        reason=reason,
        superseded_record_id=old_id,
        details={
            "effective_from": start.isoformat() if start else None,
            "learned_at": learned_at.isoformat(),
        },
    )
    return new


def alias_candidates(session, alias: str):
    """Names suggest candidates; only explicit source identity resolves automatically."""
    return [
        dict(row)
        for row in session.execute(
            select(s.entity_alias).where(s.entity_alias.c.alias.ilike(alias))
        ).mappings()
    ]


def project_market_fact(session, kind, row, variable_key):
    """Typed projections share fact identity/provenance; temporal reads join the fact."""
    if not variable_key.startswith(("market.roundwood.price.", "processor.grade.")):
        return
    grade = (
        session.execute(
            select(s.grade_definition).where(
                s.grade_definition.c.entity_id == row["subject_entity_id"]
            )
        )
        .mappings()
        .first()
    )
    provenance = {
        key: row[key]
        for key in (
            "world_id",
            "source_id",
            "evidence_item_id",
            "valid_from",
            "valid_to",
            "recorded_at",
        )
    }
    if variable_key.startswith("market.roundwood.price.") and row["numeric_value"] is not None:
        insert_row(
            session,
            s.price_observation,
            subject_entity_id=row["subject_entity_id"],
            procurement_programme_id=grade["procurement_programme_id"] if grade else None,
            grade_definition_id=grade["id"] if grade else None,
            taxon_id=grade["taxon_id"] if grade else None,
            amount=row["numeric_value"],
            currency=row["unit"].split("/")[0],
            unit=row["unit"],
            basis=row["metadata"].get("basis", "unknown"),
            **{f"{kind}_id": row["id"]},
            **provenance,
        )
    elif grade and variable_key in ("processor.grade.legacy_min_dbh", "processor.grade.min_sed"):
        insert_row(
            session,
            s.processor_specification,
            grade_definition_id=grade["id"],
            diameter_basis="legacy_dbh" if "legacy" in variable_key else "small_end_diameter",
            min_sed_cm=row["numeric_value"] if variable_key.endswith("min_sed") else None,
            **{f"{kind}_id": row["id"]},
            **provenance,
        )
