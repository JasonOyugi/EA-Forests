"""Change-assessment domain (observatory v1, section 4): canonical write
helpers for DERIVED evidence about the observation process changing.

A change candidate is never a forest-state observation and never a
biological label -- ``interpretation_class`` is constrained to
``OBSERVATION_CHANGE`` at the database CHECK-constraint level, so this
module cannot write "HARVEST"/"FIRE"/"DEGRADATION"/"MORTALITY" even if a
caller tried to. Promoting a candidate to a biological interpretation is a
distinct, separately-evidenced act (verification workflow), not performed
here.

Cross-sensor corroboration is a SEPARATE derived object: it answers only
whether independent sensor streams show temporally compatible change, not
whether a real disturbance occurred.
"""

from __future__ import annotations

from app.db import schema as s
from app.services.state.registry import audit_context, insert_row

CORROBORATION_STATES = frozenset(
    {
        "OPTICAL_ONLY",
        "SAR_ASC_ONLY",
        "SAR_DESC_ONLY",
        "MULTI_SENSOR_SUPPORTED",
        "SENSOR_DISAGREEMENT",
        "INSUFFICIENT_COMMON_SUPPORT",
        "INSUFFICIENT_EVIDENCE",
    }
)


def create_change_candidate(
    session,
    *,
    entity_id: str,
    aoi_version_id: str,
    world_id: str,
    sensor_stream: str,
    features: list[str],
    baseline_window: tuple,
    candidate_window: tuple,
    algorithm: str,
    algorithm_version: str,
    config_version: str,
    statistic: float,
    baseline_observation_ids: list[str],
    candidate_observation_ids: list[str],
    persistence: float | None = None,
    common_support_fraction: float | None = None,
    baseline_acquisition_count: int | None = None,
    candidate_acquisition_count: int | None = None,
    method_config: dict | None = None,
    metadata: dict | None = None,
) -> dict:
    """A candidate with no real supporting observation on either side is a
    contradiction in terms -- both lists must be non-empty, not just their
    union. This is the software-level lineage guarantee the domain object
    is defined to carry.
    """
    if not baseline_observation_ids:
        raise ValueError("A change candidate requires at least one baseline eo_observation_id")
    if not candidate_observation_ids:
        raise ValueError("A change candidate requires at least one candidate eo_observation_id")

    audit_context(session, "change-domain", f"Create change candidate ({sensor_stream}/{algorithm})")
    candidate = insert_row(
        session,
        s.change_candidate,
        entity_id=entity_id,
        aoi_version_id=aoi_version_id,
        world_id=world_id,
        sensor_stream=sensor_stream,
        features=list(features),
        baseline_window_start=baseline_window[0],
        baseline_window_end=baseline_window[1],
        candidate_window_start=candidate_window[0],
        candidate_window_end=candidate_window[1],
        algorithm=algorithm,
        algorithm_version=algorithm_version,
        config_version=config_version,
        method_config=method_config or {},
        statistic=statistic,
        persistence=persistence,
        common_support_fraction=common_support_fraction,
        baseline_acquisition_count=baseline_acquisition_count,
        candidate_acquisition_count=candidate_acquisition_count,
        metadata=metadata or {},
    )
    for observation_id in baseline_observation_ids:
        insert_row(
            session,
            s.change_candidate_source_observation,
            change_candidate_id=candidate["id"],
            eo_observation_id=observation_id,
            role="baseline",
        )
    for observation_id in candidate_observation_ids:
        insert_row(
            session,
            s.change_candidate_source_observation,
            change_candidate_id=candidate["id"],
            eo_observation_id=observation_id,
            role="candidate",
        )
    return dict(candidate)


def create_cross_sensor_corroboration(
    session,
    *,
    entity_id: str,
    aoi_version_id: str,
    world_id: str,
    reference_window: tuple,
    state: str,
    member_change_candidate_ids: list[str],
    max_temporal_offset_days: float | None = None,
    metadata: dict | None = None,
) -> dict:
    if state not in CORROBORATION_STATES:
        raise ValueError(f"Unknown corroboration state: {state!r}")
    if state != "INSUFFICIENT_EVIDENCE" and not member_change_candidate_ids:
        raise ValueError(f"State {state!r} requires at least one contributing change candidate")

    audit_context(session, "change-domain", f"Create cross-sensor corroboration ({state})")
    corroboration = insert_row(
        session,
        s.cross_sensor_corroboration,
        entity_id=entity_id,
        aoi_version_id=aoi_version_id,
        world_id=world_id,
        reference_window_start=reference_window[0],
        reference_window_end=reference_window[1],
        state=state,
        max_temporal_offset_days=max_temporal_offset_days,
        metadata=metadata or {},
    )
    for candidate_id in member_change_candidate_ids:
        insert_row(
            session,
            s.cross_sensor_corroboration_member,
            corroboration_id=corroboration["id"],
            change_candidate_id=candidate_id,
        )
    return dict(corroboration)
