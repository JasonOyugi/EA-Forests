"""Evidence-quality grading (observatory v0.2, section 1): a change
candidate's algorithm minimum-history requirement (e.g. first-difference's
3 observations, CUSUM's 5) is an EXECUTION gate, not a scientific
sufficiency threshold. A candidate that just clears the execution gate
with a single baseline month and a single candidate month, and no
persistence evidence, is algorithmically valid but should never be
reported with the same confidence as one backed by a longer, more
persistent history. This module grades that difference explicitly and
transparently -- it is NOT a calibrated probability of anything.
"""

from __future__ import annotations

from dataclasses import dataclass

PRELIMINARY = "PRELIMINARY"
REVIEWABLE = "REVIEWABLE"
STRONGER_SUPPORT = "STRONGER_SUPPORT"
EVIDENCE_GRADES = (PRELIMINARY, REVIEWABLE, STRONGER_SUPPORT)

GRADING_POLICY_VERSION = "evidence-grade/1"


@dataclass(frozen=True)
class EvidenceQualityInputs:
    baseline_acquisition_count: int
    candidate_acquisition_count: int
    post_candidate_acquisition_count: int = 0
    persistence: float | None = None
    common_support_fraction: float | None = None
    unresolved_confounder_count: int = 0


def grade_evidence(inputs: EvidenceQualityInputs) -> dict:
    """Deterministic, explainable, versioned grading -- every component that
    contributes is returned alongside the grade so a caller (or a person)
    can see exactly why, never a bare label. A grade never gets stronger
    than the weakest disqualifying factor.

    PRELIMINARY: minimal support on either side of the window, or no
    persistence evidence at all -- a candidate can have a huge statistic
    and still be PRELIMINARY (a large jump computed from one month against
    one prior month is real arithmetic, not strong evidence).

    REVIEWABLE: enough support to look at deliberately, but short of
    STRONGER_SUPPORT's bar (deeper history, demonstrated persistence,
    good common support, no unresolved confounders).

    STRONGER_SUPPORT: still not a calibrated probability of a real
    disturbance -- only a statement that the SOFTWARE-LEVEL evidence
    (history depth, persistence, support, confounders) is comparatively
    strong for this method family.
    """
    reasons: list[str] = []

    if inputs.baseline_acquisition_count < 2 or inputs.candidate_acquisition_count < 2:
        reasons.append(
            f"minimal support (baseline={inputs.baseline_acquisition_count}, "
            f"candidate={inputs.candidate_acquisition_count})"
        )
        grade = PRELIMINARY
    elif inputs.persistence is None:
        reasons.append("no persistence evidence available")
        grade = PRELIMINARY
    else:
        grade = REVIEWABLE
        if inputs.persistence < 0.5:
            reasons.append(f"low persistence ({inputs.persistence:.2f})")
        if inputs.common_support_fraction is not None and inputs.common_support_fraction < 0.5:
            reasons.append(f"low common support ({inputs.common_support_fraction:.2f})")
        if inputs.unresolved_confounder_count > 0:
            reasons.append(f"{inputs.unresolved_confounder_count} unresolved confounder(s)")
        if inputs.post_candidate_acquisition_count == 0:
            reasons.append("no post-candidate observation yet to confirm persistence continues")

        qualifies_for_stronger = (
            inputs.baseline_acquisition_count >= 3
            and inputs.candidate_acquisition_count >= 2
            and inputs.persistence >= 0.5
            and (inputs.common_support_fraction is None or inputs.common_support_fraction >= 0.5)
            and inputs.unresolved_confounder_count == 0
        )
        if qualifies_for_stronger:
            grade = STRONGER_SUPPORT
            reasons = ["adequate history, demonstrated persistence, good common support, no unresolved confounders"]

    return {
        "grade": grade,
        "policy_version": GRADING_POLICY_VERSION,
        "reasons": reasons,
        "inputs": {
            "baseline_acquisition_count": inputs.baseline_acquisition_count,
            "candidate_acquisition_count": inputs.candidate_acquisition_count,
            "post_candidate_acquisition_count": inputs.post_candidate_acquisition_count,
            "persistence": inputs.persistence,
            "common_support_fraction": inputs.common_support_fraction,
            "unresolved_confounder_count": inputs.unresolved_confounder_count,
        },
    }
