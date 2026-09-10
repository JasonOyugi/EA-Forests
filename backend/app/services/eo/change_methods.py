"""Change-algorithm experiment harness (observatory v1, section 4.3).

SOFTWARE/DOMAIN separated from SCIENTIFIC VALIDATION, exactly per
instruction: these functions are pure, take a plain time series, and are
verified here only against controlled synthetic series (Level 1/2
validation -- software correctness, not biological sensitivity or
specificity). No method here is "selected" as a national default; this is
a comparison harness, and every method declares its own minimum history,
assumptions, and missing-data behavior so a caller can judge fitness
before trusting an output -- and so ``run_methods`` can refuse to run a
method on a history shorter than it declares.

A ``MethodResult`` is NOT a ``change_candidate`` row -- it is the pure
statistical output a caller uses to construct one (see
``app.services.eo.change_domain``), attaching real entity/AOI/observation
identity the methods here know nothing about.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class SeriesPoint:
    date: datetime
    value: float
    support_fraction: float | None = None


@dataclass(frozen=True)
class MethodResult:
    algorithm: str
    algorithm_version: str
    detected: bool
    statistic: float
    change_index: int | None  # index into the FILTERED series the caller passed in
    persistence: float | None
    notes: str = ""


@dataclass(frozen=True)
class MethodSpec:
    key: str
    version: str
    minimum_history: int
    assumptions: str
    missing_data_behavior: str
    seasonality_sensitivity: str
    output_semantics: str
    run: object = field(repr=False)


def _robust_z_scores(values: list[float]) -> list[float]:
    """Iglewicz-Hoaglin modified z-score: median/MAD-based, robust to a
    single outlier dominating the scale estimate the way a mean/stdev
    z-score would be.

    MAD itself is 0 whenever a MAJORITY of values are identical -- which is
    exactly what a single clean step in an otherwise-constant series looks
    like (all differences are 0 except one). Naively returning 0 for every
    point in that case would suppress the very change it should detect, so
    this falls back to the MEAN absolute deviation as the scale estimate
    (still 0 only for a genuinely constant series, where "no signal" is the
    correct answer).
    """
    med = statistics.median(values)
    abs_dev = [abs(v - med) for v in values]
    mad = statistics.median(abs_dev)
    if mad == 0:
        mean_abs_dev = statistics.fmean(abs_dev)
        if mean_abs_dev == 0:
            return [0.0] * len(values)
        return [(v - med) / mean_abs_dev for v in values]
    return [0.6745 * (v - med) / mad for v in values]


def robust_first_difference(points: list[SeriesPoint], *, threshold: float = 3.5) -> MethodResult | None:
    if len(points) < 3:
        return None
    values = [p.value for p in points]
    diffs = [values[i] - values[i - 1] for i in range(1, len(values))]
    z_scores = _robust_z_scores(diffs)
    abs_scores = [abs(z) for z in z_scores]
    peak = max(range(len(abs_scores)), key=lambda i: abs_scores[i])
    statistic = abs_scores[peak]
    change_index = peak + 1  # the difference at position `peak` is values[peak+1] - values[peak]
    # Persistence: of the points AFTER the candidate change, how many stayed
    # on the post-change side of the pre-change median (a simple, honest
    # measure -- not a statistical significance claim).
    pre_median = statistics.median(values[:change_index]) if change_index > 0 else values[0]
    post = values[change_index:]
    sign = 1 if values[change_index] > pre_median else -1
    persistence = (
        sum(1 for v in post if (v - pre_median) * sign > 0) / len(post) if post else None
    )
    return MethodResult(
        algorithm="robust_first_difference",
        algorithm_version="1",
        detected=statistic >= threshold,
        statistic=statistic,
        change_index=change_index,
        persistence=persistence,
        notes=f"peak robust z-score of first differences (threshold={threshold})",
    )


ROBUST_FIRST_DIFFERENCE_SPEC = MethodSpec(
    key="robust_first_difference",
    version="1",
    minimum_history=3,
    assumptions=(
        "No seasonal model; assumes consecutive points are close enough in "
        "time that a first difference is physically meaningful. Detects a "
        "single dominant step, not multiple independent steps."
    ),
    missing_data_behavior="Caller must pre-filter missing/no_observation points; this method does not interpolate.",
    seasonality_sensitivity=(
        "High -- a real seasonal cycle will look like a false 'step' with too few points to "
        "distinguish from a real disturbance. Do not run on <12 months without a seasonality check."
    ),
    output_semantics="statistic = peak robust z-score of first differences; persistence = fraction of post-change points confirming the new level.",
    run=robust_first_difference,
)


def cusum(points: list[SeriesPoint], *, threshold_std_multiples: float = 4.0) -> MethodResult | None:
    if len(points) < 5:
        return None
    values = [p.value for p in points]
    mean = statistics.fmean(values)
    stdev = statistics.pstdev(values)
    if stdev == 0:
        return MethodResult(
            algorithm="cusum",
            algorithm_version="1",
            detected=False,
            statistic=0.0,
            change_index=None,
            persistence=None,
            notes="zero variance series -- no change statistic is meaningful",
        )
    threshold = threshold_std_multiples * stdev
    pos_cusum = neg_cusum = 0.0
    peak_abs = 0.0
    peak_index = 0
    for i, v in enumerate(values):
        pos_cusum = max(0.0, pos_cusum + (v - mean))
        neg_cusum = min(0.0, neg_cusum + (v - mean))
        current_peak = max(pos_cusum, -neg_cusum)
        if current_peak > peak_abs:
            peak_abs = current_peak
            peak_index = i
    post = values[peak_index:]
    persistence = (
        sum(1 for v in post if (v - mean) * (1 if pos_cusum >= -neg_cusum else -1) > 0) / len(post)
        if post
        else None
    )
    return MethodResult(
        algorithm="cusum",
        algorithm_version="1",
        detected=peak_abs >= threshold,
        statistic=peak_abs / stdev,  # expressed in standard-deviation units, comparable across series
        change_index=peak_index,
        persistence=persistence,
        notes=f"two-sided CUSUM, threshold={threshold_std_multiples} standard deviations",
    )


CUSUM_SPEC = MethodSpec(
    key="cusum",
    version="1",
    minimum_history=5,
    assumptions=(
        "Assumes a roughly stationary mean/variance outside the change region. "
        "Sensitive to slow monotonic drift, which it can misread as a step given enough points."
    ),
    missing_data_behavior="Caller must pre-filter missing/no_observation points; this method does not interpolate.",
    seasonality_sensitivity="Moderate-to-high -- a full seasonal cycle can accumulate into a spurious CUSUM excursion; needs >=1 full cycle of history to be trustworthy.",
    output_semantics="statistic = peak cumulative deviation in standard-deviation units; persistence = fraction of post-peak points on the same side of the series mean.",
    run=cusum,
)

METHOD_REGISTRY = (ROBUST_FIRST_DIFFERENCE_SPEC, CUSUM_SPEC)


def run_methods(
    points: list[SeriesPoint], *, min_support_fraction: float = 0.0, methods=METHOD_REGISTRY
) -> dict[str, dict]:
    """Filters out points below ``min_support_fraction`` (the common-support
    requirement, section 7) BEFORE handing the series to any method, then
    runs every method whose declared ``minimum_history`` is met by what
    remains. A method is never run on a history shorter than it declares --
    its result is reported as ``skipped: insufficient_history`` instead.
    """
    usable = [p for p in points if p.support_fraction is None or p.support_fraction >= min_support_fraction]
    results = {}
    for spec in methods:
        if len(usable) < spec.minimum_history:
            results[spec.key] = {
                "skipped": "insufficient_history",
                "minimum_history": spec.minimum_history,
                "available": len(usable),
            }
            continue
        outcome = spec.run(usable)
        results[spec.key] = {
            "skipped": None,
            "result": outcome,
            "spec": {
                "assumptions": spec.assumptions,
                "missing_data_behavior": spec.missing_data_behavior,
                "seasonality_sensitivity": spec.seasonality_sensitivity,
                "output_semantics": spec.output_semantics,
            },
        }
    return results
