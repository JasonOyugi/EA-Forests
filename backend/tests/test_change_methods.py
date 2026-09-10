"""Change-algorithm harness (observatory v1, section 4.3): Level 1/2
validation ONLY -- controlled synthetic series proving software
correctness, never a claim about biological sensitivity/specificity. Pure
functions, no database.
"""

from datetime import UTC, datetime, timedelta

from app.services.eo.change_methods import (
    METHOD_REGISTRY,
    SeriesPoint,
    cusum,
    robust_first_difference,
    run_methods,
)


def _series(values, support=None):
    start = datetime(2026, 1, 1, tzinfo=UTC)
    return [
        SeriesPoint(date=start + timedelta(days=30 * i), value=v, support_fraction=support)
        for i, v in enumerate(values)
    ]


def test_flat_series_is_not_detected_by_either_method():
    points = _series([10.0, 10.1, 9.9, 10.0, 10.05, 9.95, 10.0, 10.1])
    assert robust_first_difference(points).detected is False
    assert cusum(points).detected is False


def test_isolated_spike_is_flagged_but_with_low_persistence():
    points = _series([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 50, 10, 10, 10, 10, 10])
    result = robust_first_difference(points)
    assert result.detected is True
    assert result.change_index == 10
    assert result.persistence < 0.3  # reverted almost immediately -- not a real level shift


def test_persistent_step_is_flagged_with_high_persistence():
    points = _series([10] * 10 + [20] * 10)
    result = robust_first_difference(points)
    assert result.detected is True
    assert result.persistence == 1.0


def test_gradual_linear_trend_is_not_read_as_a_sudden_step():
    points = _series([float(i) for i in range(1, 21)])
    result = robust_first_difference(points)
    # Every first difference is identical (=1) -- MAD is zero, so this
    # method correctly declines to invent a step out of a smooth trend.
    assert result.statistic == 0.0
    assert result.detected is False


def test_gradual_trend_can_still_accumulate_in_cusum_documented_limitation():
    points = _series([float(i) for i in range(1, 21)])
    result = cusum(points)
    # Documented limitation, not a desired property: CUSUM's cumulative
    # deviation from the series mean grows monotonically under a steady
    # trend and can cross the threshold -- this is exactly why
    # CUSUM_SPEC.seasonality_sensitivity warns about slow monotonic drift.
    assert result.statistic > 0


def test_methods_refuse_to_run_below_their_declared_minimum_history():
    points = _series([10, 20])  # below both methods' minimum_history
    results = run_methods(points)
    assert results["robust_first_difference"]["skipped"] == "insufficient_history"
    assert results["cusum"]["skipped"] == "insufficient_history"
    assert results["robust_first_difference"]["minimum_history"] == 3
    assert results["cusum"]["minimum_history"] == 5


def test_low_support_points_are_filtered_before_any_method_runs():
    good = _series([10] * 5 + [20] * 5, support=0.9)
    low_support_gap = [SeriesPoint(date=good[4].date + timedelta(days=1), value=999, support_fraction=0.1)]
    points = good[:5] + low_support_gap + good[5:]
    results = run_methods(points, min_support_fraction=0.5)
    # The spurious low-support point (value=999) must never reach a method.
    result = results["robust_first_difference"]["result"]
    assert result.persistence == 1.0  # matches the clean persistent-step case, not a spike artifact


def test_missing_months_are_simply_absent_never_interpolated():
    # Points 30 days apart except one 90-day gap (a missed month) --
    # callers omit missing points entirely; this proves the method does
    # not require, and does not fabricate, evenly-spaced input.
    start = datetime(2026, 1, 1, tzinfo=UTC)
    points = [
        SeriesPoint(date=start, value=10.0),
        SeriesPoint(date=start + timedelta(days=30), value=10.0),
        SeriesPoint(date=start + timedelta(days=150), value=20.0),  # gap: months 3-4 missing
        SeriesPoint(date=start + timedelta(days=180), value=20.0),
        SeriesPoint(date=start + timedelta(days=210), value=20.0),
    ]
    result = robust_first_difference(points)
    assert result is not None
    assert result.detected is True


def test_method_registry_specs_document_minimum_history_and_assumptions():
    for spec in METHOD_REGISTRY:
        assert spec.minimum_history > 0
        assert spec.assumptions
        assert spec.missing_data_behavior
        assert spec.seasonality_sensitivity
        assert spec.output_semantics
