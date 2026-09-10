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
        "SINGLE_STREAM",
        "WITHIN_SENSOR_MULTI_STREAM_SUPPORTED",
        "CROSS_SENSOR_SUPPORTED",
        "CROSS_MODALITY_SUPPORTED",
        "SENSOR_DISAGREEMENT",
        "INSUFFICIENT_COMMON_SUPPORT",
        "INSUFFICIENT_EVIDENCE",
    }
)

# Sensor-family/modality identity for each known sensor_stream (migration
# 0012). Ascending and descending Sentinel-1 are the SAME sensor family
# (Sentinel-1 C-band SAR) and the SAME modality (radar) -- two streams of
# one instrument, not two instruments. This is exactly the distinction the
# original vocabulary blurred (a real Musamya candidate satisfied
# "MULTI_SENSOR_SUPPORTED" from S1 ascending + descending agreement alone).
STREAM_SENSOR_FAMILY = {
    "s2_optical": "sentinel-2",
    "s1_ascending": "sentinel-1",
    "s1_descending": "sentinel-1",
}
STREAM_MODALITY = {
    "s2_optical": "optical",
    "s1_ascending": "radar",
    "s1_descending": "radar",
}


def classify_corroboration_state(streams: list[str], *, temporally_compatible: bool) -> tuple[str, dict]:
    """Derives both the corroboration state and the distinct stream/sensor-
    family/modality counts that justify it, from the sensor streams of the
    contributing change candidates alone -- the classification is not a
    free-form caller choice. An unrecognized stream is treated as its own
    singleton sensor family/modality (conservative: never silently assumed
    to corroborate an existing one).
    """
    if not streams:
        return "INSUFFICIENT_EVIDENCE", {
            "distinct_stream_count": 0,
            "distinct_sensor_family_count": 0,
            "distinct_modality_count": 0,
        }
    distinct_streams = set(streams)
    families = {STREAM_SENSOR_FAMILY.get(stream, stream) for stream in distinct_streams}
    modalities = {STREAM_MODALITY.get(stream, f"unknown:{stream}") for stream in distinct_streams}
    counts = {
        "distinct_stream_count": len(distinct_streams),
        "distinct_sensor_family_count": len(families),
        "distinct_modality_count": len(modalities),
    }
    if len(distinct_streams) == 1:
        return "SINGLE_STREAM", counts
    if not temporally_compatible:
        return "SENSOR_DISAGREEMENT", counts
    if len(modalities) >= 2:
        return "CROSS_MODALITY_SUPPORTED", counts
    if len(families) >= 2:
        return "CROSS_SENSOR_SUPPORTED", counts
    return "WITHIN_SENSOR_MULTI_STREAM_SUPPORTED", counts


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
    members: list[dict],
    temporally_compatible: bool = True,
    common_support_ok: bool = True,
    max_temporal_offset_days: float | None = None,
    metadata: dict | None = None,
) -> dict:
    """``members``: one dict per contributing change candidate, each
    ``{"change_candidate_id": ..., "sensor_stream": ...}``. The state is
    DERIVED here from the members' real sensor streams
    (``classify_corroboration_state``), never accepted as a free-form
    caller value -- this is what makes it impossible to again label two
    streams of one sensor (e.g. S1 ascending + descending) as cross-sensor
    or cross-modality support: the counts are computed from the data, and
    the state name is picked to match them, not the other way around.
    ``common_support_ok=False`` overrides to INSUFFICIENT_COMMON_SUPPORT
    regardless of stream composition (a distinct failure mode: enough
    streams detected something, but their spatial/acquisition support
    does not overlap enough to compare them meaningfully).
    """
    if not common_support_ok and members:
        state = "INSUFFICIENT_COMMON_SUPPORT"
        counts = {"distinct_stream_count": None, "distinct_sensor_family_count": None, "distinct_modality_count": None}
    else:
        state, counts = classify_corroboration_state(
            [m["sensor_stream"] for m in members], temporally_compatible=temporally_compatible
        )
    if state != "INSUFFICIENT_EVIDENCE" and not members:
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
        distinct_stream_count=counts["distinct_stream_count"],
        distinct_sensor_family_count=counts["distinct_sensor_family_count"],
        distinct_modality_count=counts["distinct_modality_count"],
        metadata=metadata or {},
    )
    for member in members:
        insert_row(
            session,
            s.cross_sensor_corroboration_member,
            corroboration_id=corroboration["id"],
            change_candidate_id=member["change_candidate_id"],
        )
    return dict(corroboration)
