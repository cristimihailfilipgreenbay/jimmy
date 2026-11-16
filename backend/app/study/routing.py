"""Grading and Dispute routing (docs/domain.md, section 3a).

A grade is uncertain when the grader is unsure of itself or when the score is so close to
the pass line that a small difference would flip it. The Student then decides.
"""

from app.study.questions import PASS_LINE

DISPUTE_CONFIDENCE = 0.7
DISPUTE_MARGIN = 0.15


def needs_dispute(
    score: float,
    confidence: float,
    *,
    threshold: float = DISPUTE_CONFIDENCE,
    margin: float = DISPUTE_MARGIN,
    pass_line: float = PASS_LINE,
) -> bool:
    """True when the confidence is under `threshold` or the score is within `margin` of
    the pass line (the edges count as certain)."""
    return confidence < threshold or abs(score - pass_line) < margin
