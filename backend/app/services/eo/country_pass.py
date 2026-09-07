"""Country-run summary (Uganda EO country pass Part 10): a derived report
over persisted observation results, never a second source of truth. Every
cohort member must be accounted for -- this module never silently drops a
failed/partial/no_observation CFR from the totals.
"""

from __future__ import annotations

from dataclasses import dataclass


def _percentile(values: list[float], p: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round(p * (len(ordered) - 1))))
    return ordered[index]


def _median(values: list[float]) -> float | None:
    return _percentile(values, 0.5)


@dataclass(frozen=True)
class CohortMember:
    source_record_key: str
    area_ha: float
    job_status: str | None  # succeeded / failed / claim_failed / already_terminal / ingest_failed / None
    outcome: str | None  # success / partial / no_observation / failed / None
    usable_observation_fraction: float | None
    eligible_acquisition_count: int | None


LOW_SUPPORT_ACQUISITION_THRESHOLD = 2  # matches MIN_SUPPORT_ACQUISITIONS (ee_provider.py)


def build_country_summary(members: list[CohortMember]) -> dict:
    total_submitted = len(members)
    succeeded_jobs = sum(1 for m in members if m.job_status == "succeeded")
    failed_jobs = sum(1 for m in members if m.job_status not in ("succeeded",))

    by_outcome = {"success": [], "partial": [], "no_observation": [], "failed_or_unprocessed": []}
    for m in members:
        if m.outcome == "success":
            by_outcome["success"].append(m)
        elif m.outcome == "partial":
            by_outcome["partial"].append(m)
        elif m.outcome == "no_observation":
            by_outcome["no_observation"].append(m)
        else:
            # Covers scientific outcome "failed" AND any job that never
            # reached a scientific outcome at all (ingest/claim failure) --
            # both are unprocessed area, never silently omitted.
            by_outcome["failed_or_unprocessed"].append(m)

    total_area_ha = sum(m.area_ha for m in members)
    area_by_outcome = {key: sum(m.area_ha for m in group) for key, group in by_outcome.items()}

    coverage_values = [m.usable_observation_fraction for m in members if m.usable_observation_fraction is not None]
    eligible_counts = [
        m.eligible_acquisition_count for m in members if m.eligible_acquisition_count is not None
    ]
    low_support_count = sum(
        1
        for m in members
        if m.eligible_acquisition_count is not None
        and m.eligible_acquisition_count < LOW_SUPPORT_ACQUISITION_THRESHOLD
    )

    return {
        "total_cfrs_submitted": total_submitted,
        "succeeded_jobs": succeeded_jobs,
        "failed_jobs": failed_jobs,
        "scientific_outcomes": {
            "success": len(by_outcome["success"]),
            "partial": len(by_outcome["partial"]),
            "no_observation": len(by_outcome["no_observation"]),
            "failed_or_unprocessed": len(by_outcome["failed_or_unprocessed"]),
        },
        "coverage": {
            "total_processable_area_ha": total_area_ha,
            "success_area_ha": area_by_outcome["success"],
            "partial_area_ha": area_by_outcome["partial"],
            "no_observation_area_ha": area_by_outcome["no_observation"],
            "failed_or_unprocessed_area_ha": area_by_outcome["failed_or_unprocessed"],
        },
        "quality": {
            "median_usable_coverage": _median(coverage_values),
            "p10_usable_coverage": _percentile(coverage_values, 0.10),
            "p90_usable_coverage": _percentile(coverage_values, 0.90),
            "median_eligible_acquisition_count": _median([float(v) for v in eligible_counts]),
            "low_support_cfr_count": low_support_count,
        },
        # Descriptive only -- never a "national forest condition" claim (see
        # docstring/report): the AOI-estate-wide feature distribution across
        # whatever CFRs succeeded this pass, nothing more.
        "note": (
            "Coverage and quality figures describe this Sentinel-2 pass's technical "
            "completeness, not forest condition. No national mean NDVI/NDMI/NBR is "
            "computed here; per-CFR values remain in observations.eo_feature_value."
        ),
    }
