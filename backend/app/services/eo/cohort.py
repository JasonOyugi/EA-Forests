"""Frozen EO execution cohorts (multi-sensor observatory v1, section 1).

A cohort is a snapshot of which existing ``geo.aoi_version`` rows a sensor
backfill should run against, identified by (country, cohort_key,
definition_version). It never creates, ingests, or supersedes canonical
geometry -- it only names AOI versions that some prior ingestion step
already produced. This is the fix for every earlier national backfill
re-running ``ingest_cfr_polygons()`` for the full CFR estate on every single
sensor invocation: redundant once canonical geometry exists, and the
direct cause of the verified PostgreSQL contention when the Sentinel-1 and
Sentinel-2 backfills both tried to re-ingest the same 656 CFRs at once.

Freezing is one-shot per (country, cohort_key, definition_version): calling
``freeze_cohort`` again for an identity that already exists is a no-op that
returns the existing cohort untouched. Refreshing membership (e.g. after a
real geometry correction is ingested) means freezing a NEW
definition_version, never mutating an existing one -- consistent with the
append-only spirit of the rest of this schema.
"""

from __future__ import annotations

from sqlalchemy import func, select

from app.db import schema as s
from app.services.state.registry import audit_context, insert_row

EO_PROCESSABLE = "EO_PROCESSABLE"


def freeze_cohort(
    session,
    *,
    world_id: str,
    country: str,
    cohort_key: str,
    definition_version: str,
    candidates: list[dict],
    note: str | None = None,
) -> dict:
    """``candidates``: resolved canonical identities to freeze, each a dict
    with ``source_record_key``, ``entity_id``, ``aoi_id``, ``aoi_version_id``,
    ``geometry_hash`` -- already read from canonical state by the caller
    (e.g. ``resolve_uganda_cfr_candidates`` below). A candidate missing an
    ``aoi_version_id`` (not yet EO-processable) is not stored as a member;
    the caller is expected to report exclusions itself, since this function
    only records what IS a real, resolvable cohort member.
    """
    existing = (
        session.execute(
            select(s.eo_cohort).where(
                s.eo_cohort.c.country == country,
                s.eo_cohort.c.cohort_key == cohort_key,
                s.eo_cohort.c.definition_version == definition_version,
            )
        )
        .mappings()
        .first()
    )
    if existing:
        member_count = session.scalar(
            select(func.count()).where(s.eo_cohort_member.c.cohort_id == existing["id"])
        )
        return {"cohort_id": str(existing["id"]), "created": False, "member_count": member_count}

    audit_context(session, "eo-cohort", f"Freeze EO cohort {country}/{cohort_key}/{definition_version}")
    cohort = insert_row(
        session,
        s.eo_cohort,
        world_id=world_id,
        country=country,
        cohort_key=cohort_key,
        definition_version=definition_version,
        note=note,
    )
    member_count = 0
    for candidate in candidates:
        if not candidate.get("aoi_version_id"):
            continue
        insert_row(
            session,
            s.eo_cohort_member,
            cohort_id=cohort["id"],
            entity_id=candidate["entity_id"],
            aoi_id=candidate["aoi_id"],
            aoi_version_id=candidate["aoi_version_id"],
            source_record_key=candidate["source_record_key"],
            geometry_hash=candidate["geometry_hash"],
            eligibility_status=EO_PROCESSABLE,
        )
        member_count += 1
    return {"cohort_id": str(cohort["id"]), "created": True, "member_count": member_count}


def load_cohort(session, *, country: str, cohort_key: str, definition_version: str) -> dict[str, str]:
    """Returns ``{source_record_key: aoi_version_id}`` for every member of a
    frozen cohort. A pure read against processing.eo_cohort_member -- no
    ingestion, no writes, safe to call as often as needed (including
    concurrently with a running sensor backfill against the same database).
    """
    rows = session.execute(
        select(s.eo_cohort_member.c.source_record_key, s.eo_cohort_member.c.aoi_version_id)
        .select_from(
            s.eo_cohort_member.join(s.eo_cohort, s.eo_cohort_member.c.cohort_id == s.eo_cohort.c.id)
        )
        .where(
            s.eo_cohort.c.country == country,
            s.eo_cohort.c.cohort_key == cohort_key,
            s.eo_cohort.c.definition_version == definition_version,
        )
    ).all()
    return {row.source_record_key: str(row.aoi_version_id) for row in rows}


def resolve_uganda_cfr_candidates(session, source_record_keys: list[str]) -> tuple[list[dict], list[str]]:
    """Read-only resolution of current canonical state for Uganda CFRs --
    deliberately does NOT call ``cfr_geometry.ingest_cfr_polygons``. Returns
    (resolved_candidates, unresolved_source_record_keys); a key is
    unresolved if it has no canonical entity yet, or that entity has no
    current (non-superseded) AOI version under the Uganda CFR analysis
    scope -- i.e. ingestion has not (yet) produced EO-processable geometry
    for it. Run ``scripts/run_uganda_country_pass.py`` or an equivalent
    ingestion pass first if the unresolved list is non-empty and should not
    be.
    """
    rows = session.execute(
        select(
            s.external_identity.c.source_record_key,
            s.external_identity.c.entity_id,
            s.aoi.c.id.label("aoi_id"),
            s.aoi_version.c.id.label("aoi_version_id"),
            s.aoi_version.c.geometry_hash,
        )
        .select_from(
            s.external_identity.join(
                s.aoi, s.aoi.c.geometry_owner_entity_id == s.external_identity.c.entity_id
            ).join(
                s.aoi_version,
                (s.aoi_version.c.aoi_id == s.aoi.c.id) & s.aoi_version.c.superseded_at.is_(None),
            )
        )
        .where(
            s.external_identity.c.dataset == "central-forest-reserves",
            s.external_identity.c.role == "asset",
            s.aoi.c.analysis_scope == "uganda_cfr_commercial_eo_mvp",
            s.external_identity.c.source_record_key.in_(source_record_keys),
        )
    ).all()
    resolved_by_key = {
        row.source_record_key: {
            "source_record_key": row.source_record_key,
            "entity_id": str(row.entity_id),
            "aoi_id": str(row.aoi_id),
            "aoi_version_id": str(row.aoi_version_id),
            "geometry_hash": row.geometry_hash,
        }
        for row in rows
    }
    unresolved = [key for key in source_record_keys if key not in resolved_by_key]
    return list(resolved_by_key.values()), unresolved
