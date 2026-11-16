"""Which grades go to the Student: low confidence, or a score near the pass line."""

import pytest

from app.study.questions import PASS_LINE
from app.study.routing import needs_dispute


def test_a_confident_clear_grade_is_not_disputed():
    assert not needs_dispute(1.0, 0.95)
    assert not needs_dispute(0.0, 0.9)


def test_low_confidence_is_disputed_whatever_the_score():
    assert needs_dispute(1.0, 0.69)
    assert needs_dispute(0.0, 0.2)


def test_confidence_at_the_threshold_is_certain():
    assert not needs_dispute(1.0, 0.7)


def test_a_score_near_the_pass_line_is_disputed_even_when_confident():
    assert needs_dispute(PASS_LINE, 0.95)
    assert needs_dispute(PASS_LINE + 0.1, 1.0)
    assert needs_dispute(PASS_LINE - 0.1, 1.0)


def test_a_score_a_full_margin_away_is_certain():
    # The margin itself is outside the window.
    assert not needs_dispute(PASS_LINE + 0.15, 1.0, margin=0.15)
    assert not needs_dispute(PASS_LINE - 0.15, 1.0, margin=0.15)


@pytest.mark.parametrize(
    ("threshold", "margin", "expected"),
    [(0.9, 0.15, True), (0.5, 0.15, False), (0.5, 0.3, True)],
)
def test_both_thresholds_are_settings(threshold, margin, expected):
    assert needs_dispute(0.8, 0.8, threshold=threshold, margin=margin) is expected
