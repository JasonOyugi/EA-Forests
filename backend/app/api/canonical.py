import hmac
import json
import os
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError, NoResultFound, OperationalError
from sqlalchemy.orm import Session

from app.db import schema as s
from app.db.session import session_scope
from app.domain.values import FactCreate
from app.schemas import RoundwoodProductionRequest
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.state.facts import FACT_TABLES, create_fact, supersede_fact, temporal_query
from app.services.state.legacy_roundwood import run_from_snapshot
from app.services.state.registry import audit_context, insert_row
from app.services.state.snapshots import build_snapshot, explain_snapshot


def require_access(authorization: str | None = Header(default=None)):
    expected = os.getenv("CANONICAL_API_TOKEN")
    if not expected:
        raise HTTPException(503, "Canonical administrative API is not enabled")
    if not authorization or not hmac.compare_digest(authorization, f"Bearer {expected}"):
        raise HTTPException(401, "Canonical API credentials required")


def database():
    try:
        yield from session_scope()
    except OperationalError as exc:
        raise HTTPException(503, "Canonical datastore is unavailable") from exc
    except DBAPIError as exc:
        raise HTTPException(409, "Canonical integrity constraint rejected the write") from exc
    except NoResultFound as exc:
        raise HTTPException(404, "Canonical record not found") from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


DB = Annotated[Session, Depends(database)]
router = APIRouter(
    prefix="/api/canonical", tags=["Canonical state"], dependencies=[Depends(require_access)]
)


class Request(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EntityCreate(Request):
    entity_type: str = Field(min_length=1)
    canonical_name: str = Field(min_length=1)
    reason: str = Field(min_length=1)


@router.post("/entities", status_code=201)
def create_entity(payload: EntityCreate, db: DB):
    audit_context(db, "canonical-api", payload.reason)
    return insert_row(
        db, s.entity, entity_type=payload.entity_type, canonical_name=payload.canonical_name
    )


@router.get("/entities")
def list_entities(
    db: DB,
    entity_type: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    query = (
        select(s.entity.c.id, s.entity.c.entity_type, s.entity.c.canonical_name, s.entity.c.status)
        .order_by(s.entity.c.id)
        .limit(limit)
        .offset(offset)
    )
    if entity_type:
        query = query.where(s.entity.c.entity_type == entity_type)
    return [dict(row) for row in db.execute(query).mappings()]


@router.get("/worlds")
def worlds(db: DB):
    return [dict(row) for row in db.execute(select(s.world)).mappings()]


class EvidenceCreate(Request):
    source_type: str = Field(min_length=1)
    title: str = Field(min_length=1)
    publisher: str | None = None
    uri: str | None = None
    access: Literal["public", "restricted", "confidential"] = "restricted"
    data_class: Literal["OBSERVED", "REPORTED", "ASSUMED", "SYNTHETIC", "UNKNOWN"]
    data_vintage: str | None = None
    original_filename: str = Field(min_length=1, max_length=255)
    media_type: str = "text/plain"
    content_utf8: str = Field(min_length=1, max_length=1_000_000)
    locator: dict = Field(default_factory=dict)
    reason: str = Field(min_length=1)


@router.post("/evidence", status_code=201)
def register_evidence(payload: EvidenceCreate, db: DB):
    audit_context(db, "canonical-api", payload.reason)
    uri, digest = LocalArtifactStore().put(payload.content_utf8.encode("utf8"))
    source = insert_row(
        db,
        s.source,
        **payload.model_dump(
            include={
                "source_type",
                "title",
                "publisher",
                "uri",
                "access",
                "data_class",
                "data_vintage",
            }
        ),
    )
    ingest = insert_row(
        db,
        s.raw_ingest,
        source_id=source["id"],
        batch_id=uuid4(),
        artifact_uri=uri,
        content_hash=digest,
        original_filename=payload.original_filename,
        media_type=payload.media_type,
        parser_version="api-utf8/0.1",
    )
    raw = json.loads(payload.content_utf8) if payload.media_type == "application/json" else None
    item = insert_row(
        db,
        s.evidence_item,
        source_id=source["id"],
        raw_ingest_id=ingest["id"],
        kind="submitted_document",
        data_class=payload.data_class,
        locator=payload.locator,
        content_hash=digest,
        raw_record=raw,
    )
    return {
        "evidence_item_id": item["id"],
        "source_id": source["id"],
        "raw_ingest_id": ingest["id"],
        "content_hash": digest,
    }


@router.get("/evidence/{evidence_id}")
def evidence(evidence_id: UUID, db: DB):
    row = (
        db.execute(select(s.evidence_item).where(s.evidence_item.c.id == evidence_id))
        .mappings()
        .one_or_none()
    )
    if not row:
        raise HTTPException(404, "Evidence not found")
    source = db.execute(select(s.source).where(s.source.c.id == row["source_id"])).mappings().one()
    return {
        "id": row["id"],
        "source_id": row["source_id"],
        "kind": row["kind"],
        "content_hash": row["content_hash"],
        "access": source["access"],
        "locator": row["locator"] if source["access"] == "public" else None,
    }


def safe_fact(row):
    return {
        key: value for key, value in row.items() if key not in ("valid_period", "knowledge_period")
    }


@router.post("/observations", status_code=201)
def observe(payload: FactCreate, db: DB):
    return safe_fact(create_fact(db, "observation", payload, actor="canonical-api"))


@router.post("/assertions", status_code=201)
def assert_claim(payload: FactCreate, db: DB):
    return safe_fact(create_fact(db, "assertion", payload, actor="canonical-api"))


@router.get("/facts/{kind}")
def facts(
    kind: Literal["observation", "assertion"],
    entity_id: UUID,
    world_id: UUID,
    as_of: AwareDatetime,
    known_at: AwareDatetime,
    db: DB,
    limit: int = Query(100, ge=1, le=500),
):
    table = FACT_TABLES[kind]
    rows = db.execute(
        temporal_query(table, valid_at=as_of, known_at=known_at)
        .where(table.c.subject_entity_id == entity_id, table.c.world_id == world_id)
        .order_by(table.c.recorded_at, table.c.id)
        .limit(limit)
    ).mappings()
    return [safe_fact(row) for row in rows]


class Supersede(Request):
    replacement: FactCreate
    reason: str = Field(min_length=1)


@router.post("/facts/{kind}/{fact_id}/supersede")
def supersede(kind: Literal["observation", "assertion"], fact_id: UUID, payload: Supersede, db: DB):
    return safe_fact(
        supersede_fact(
            db, kind, fact_id, payload.replacement, actor="canonical-api", reason=payload.reason
        )
    )


class SnapshotInput(Request):
    kind: Literal["observation", "assertion", "geometry_observation"]
    id: UUID


class SnapshotCreate(Request):
    entity_id: UUID
    world_id: UUID
    as_of: AwareDatetime
    known_at: AwareDatetime | None = None
    inputs: list[SnapshotInput] | None = None
    parent_snapshot_id: UUID | None = None


@router.post("/state-snapshots", status_code=201)
def snapshot(payload: SnapshotCreate, db: DB):
    return build_snapshot(db, **payload.model_dump())


@router.get("/state-snapshots/{snapshot_id}")
def get_snapshot(snapshot_id: UUID, db: DB):
    return explain_snapshot(db, snapshot_id)


@router.get("/state/{entity_id}/explain")
def explain(
    entity_id: UUID,
    world_id: UUID,
    db: DB,
    as_of: AwareDatetime | None = None,
    known_at: AwareDatetime | None = None,
):
    query = select(s.state_snapshot.c.id).where(
        s.state_snapshot.c.entity_id == entity_id, s.state_snapshot.c.world_id == world_id
    )
    if as_of:
        query = query.where(s.state_snapshot.c.as_of <= as_of)
    if known_at:
        query = query.where(s.state_snapshot.c.known_at <= known_at)
    snapshot_id = db.scalar(
        query.order_by(
            s.state_snapshot.c.as_of.desc(),
            s.state_snapshot.c.known_at.desc(),
            s.state_snapshot.c.created_at.desc(),
        ).limit(1)
    )
    if not snapshot_id:
        raise HTTPException(404, "No state snapshot for this world and time")
    return explain_snapshot(db, snapshot_id)


@router.get("/model-runs/{run_id}")
def model_run(run_id: UUID, db: DB):
    row = db.execute(select(s.model_run).where(s.model_run.c.id == run_id)).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Model run not found")
    return dict(row)


class VerificationCreate(Request):
    target_entity_id: UUID
    world_id: UUID
    variable_definition_id: UUID | None = None
    reason: str = Field(min_length=1)
    priority: int = 0
    sampling_plan: dict = Field(default_factory=dict)
    due_at: AwareDatetime | None = None


@router.post("/verification-tasks", status_code=201)
def verify(payload: VerificationCreate, db: DB):
    audit_context(db, "canonical-api", payload.reason)
    return insert_row(db, s.verification_task, **payload.model_dump())


@router.get("/verification-tasks")
def verification_tasks(world_id: UUID, db: DB, limit: int = Query(100, ge=1, le=200)):
    return [
        dict(row)
        for row in db.execute(
            select(s.verification_task)
            .where(s.verification_task.c.world_id == world_id)
            .order_by(s.verification_task.c.priority.desc(), s.verification_task.c.created_at)
            .limit(limit)
        ).mappings()
    ]


class RoundwoodEvaluate(Request):
    snapshot_id: UUID
    scenario: RoundwoodProductionRequest
    assumed_missing_thresholds: dict[str, float] = Field(default_factory=dict)


@router.post("/models/roundwood-grade-yields")
def evaluate(payload: RoundwoodEvaluate, db: DB):
    return run_from_snapshot(
        db,
        payload.snapshot_id,
        payload.scenario,
        assumed_missing_thresholds=payload.assumed_missing_thresholds,
    )
