"""Multi-sensor availability matrix (observatory v1, section 4).

Answers exactly one question: for a cohort member (CFR) at a given month,
what evidence do we actually possess, per sensor lane? It never fuses
feature values across lanes and never interprets biology -- a cell reports
job/observation bookkeeping (status, outcome, support, acquisition count,
recipe/version), nothing more. Built directly from ``processing.eo_job``
and ``observations.eo_observation`` -- no new source of truth.
"""

from __future__ import annotations

from sqlalchemy import select

from app.db import schema as s
from app.services.eo.feature_registry import FEATURE_RECIPE_KEY
from app.services.eo.sar_feature_registry import RECIPE_KEY_ASCENDING, RECIPE_KEY_DESCENDING

# Lane identity is (collection_key, recipe_key) -- the same homogeneous-stream
# identity the job/series layer already enforces. Ascending and descending
# Sentinel-1 are distinct lanes on purpose (EO observation architecture:
# never blend orbit-pass directions into one series).
LANE_BY_RECIPE_KEY = {
    FEATURE_RECIPE_KEY: "s2_optical",
    RECIPE_KEY_ASCENDING: "s1_ascending",
    RECIPE_KEY_DESCENDING: "s1_descending",
}
ALL_LANES = ("s2_optical", "s1_ascending", "s1_descending")


def build_availability_matrix(session, cohort_members: dict[str, str]) -> dict[str, dict[str, dict]]:
    """``cohort_members``: ``{source_record_key: aoi_version_id}`` (e.g. from
    ``app.services.eo.cohort.load_cohort``). Returns
    ``{source_record_key: {"YYYY-MM": {lane: cell_or_missing}}}`` -- a month
    with no job row for a lane at all is simply absent from that month's
    dict, distinguished from a job that exists but has not reached a
    terminal outcome (``job_status`` will say so).
    """
    if not cohort_members:
        return {}
    key_by_aoi_version = {v: k for k, v in cohort_members.items()}
    rows = session.execute(
        select(
            s.eo_job.c.aoi_version_id,
            s.eo_job.c.window_start,
            s.eo_job.c.window_end,
            s.eo_job.c.recipe_key,
            s.eo_job.c.recipe_version,
            s.eo_job.c.status,
            s.eo_observation.c.outcome,
            s.eo_observation.c.usable_observation_fraction,
            s.eo_observation.c.acquisition_count,
            s.eo_observation.c.eligible_acquisition_count,
        )
        .select_from(
            s.eo_job.outerjoin(s.eo_observation, s.eo_job.c.eo_observation_id == s.eo_observation.c.id)
        )
        .where(s.eo_job.c.aoi_version_id.in_(list(cohort_members.values())))
    ).all()

    matrix: dict[str, dict[str, dict]] = {}
    for row in rows:
        key = key_by_aoi_version.get(str(row.aoi_version_id))
        lane = LANE_BY_RECIPE_KEY.get(row.recipe_key)
        if key is None or lane is None:
            continue
        month_key = row.window_start.strftime("%Y-%m")
        cell = {
            "job_status": row.status,
            "outcome": row.outcome,
            "usable_observation_fraction": (
                float(row.usable_observation_fraction)
                if row.usable_observation_fraction is not None
                else None
            ),
            "acquisition_count": row.acquisition_count,
            "eligible_acquisition_count": row.eligible_acquisition_count,
            "window_start": row.window_start.isoformat(),
            "window_end": row.window_end.isoformat(),
            "recipe_key": row.recipe_key,
            "recipe_version": row.recipe_version,
        }
        matrix.setdefault(key, {}).setdefault(month_key, {})[lane] = cell
    return matrix


def completeness_by_lane(matrix: dict[str, dict[str, dict]], months: list[str], lanes=ALL_LANES) -> dict[str, dict]:
    """Per cohort member: how many of ``months`` have a succeeded job in
    each lane, reported PER LANE -- never collapsed into one combined
    number, so a caller cannot mistake "12/12 S2" for "12/12 everything".
    """
    summary = {}
    for key, by_month in matrix.items():
        counts = {lane: 0 for lane in lanes}
        for month in months:
            for lane, cell in by_month.get(month, {}).items():
                if lane in counts and cell["job_status"] == "succeeded":
                    counts[lane] += 1
        summary[key] = {"months_intended": len(months), **{f"{lane}_complete": n for lane, n in counts.items()}}
    return summary
