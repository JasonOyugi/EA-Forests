"""Evidence-quality grading (observatory v0.2, section 1): algorithm
minimum-history execution gates are not scientific sufficiency -- a
candidate with a huge statistic but minimal support must still grade as
PRELIMINARY, and the grade must never claim more than the weakest
disqualifying factor allows.
"""

from app.services.eo.evidence_quality import (
    PRELIMINARY,
    REVIEWABLE,
    STRONGER_SUPPORT,
    EvidenceQualityInputs,
    grade_evidence,
)


def test_one_month_baseline_and_candidate_is_preliminary_even_with_no_persistence_info():
    result = grade_evidence(
        EvidenceQualityInputs(baseline_acquisition_count=1, candidate_acquisition_count=1, persistence=None)
    )
    assert result["grade"] == PRELIMINARY
    assert "minimal support" in result["reasons"][0]


def test_adequate_support_but_no_persistence_value_is_preliminary():
    result = grade_evidence(
        EvidenceQualityInputs(baseline_acquisition_count=5, candidate_acquisition_count=3, persistence=None)
    )
    assert result["grade"] == PRELIMINARY
    assert "persistence" in result["reasons"][0]


def test_moderate_support_with_low_persistence_is_reviewable_not_stronger():
    result = grade_evidence(
        EvidenceQualityInputs(
            baseline_acquisition_count=3,
            candidate_acquisition_count=2,
            persistence=0.3,
            common_support_fraction=0.9,
        )
    )
    assert result["grade"] == REVIEWABLE
    assert any("persistence" in r for r in result["reasons"])


def test_unresolved_confounder_keeps_candidate_out_of_stronger_support():
    result = grade_evidence(
        EvidenceQualityInputs(
            baseline_acquisition_count=5,
            candidate_acquisition_count=3,
            persistence=1.0,
            common_support_fraction=1.0,
            unresolved_confounder_count=1,
        )
    )
    assert result["grade"] == REVIEWABLE
    assert any("confounder" in r for r in result["reasons"])


def test_deep_history_high_persistence_good_support_no_confounders_is_stronger_support():
    result = grade_evidence(
        EvidenceQualityInputs(
            baseline_acquisition_count=4,
            candidate_acquisition_count=3,
            post_candidate_acquisition_count=1,
            persistence=1.0,
            common_support_fraction=0.95,
            unresolved_confounder_count=0,
        )
    )
    assert result["grade"] == STRONGER_SUPPORT


def test_grade_is_never_stronger_than_weakest_factor_large_statistic_does_not_matter():
    # grade_evidence never even sees the statistic -- this test documents
    # that omission is deliberate: a huge z-score computed from minimal
    # support must still grade PRELIMINARY.
    result = grade_evidence(
        EvidenceQualityInputs(baseline_acquisition_count=1, candidate_acquisition_count=1, persistence=1.0)
    )
    assert result["grade"] == PRELIMINARY
