"""The Weak Topic rule (docs/domain.md, section 3a). Pure, so it can be unit-tested.

A Topic becomes weak after 2 wrong answers in its last 5, and stops being weak after
3 correct answers in a row. When it recovers, its earlier wrong answers are forgotten:
otherwise two old mistakes would make it weak again on the very next answer.
"""

from dataclasses import dataclass

WINDOW = 5
WRONG_TO_BECOME_WEAK = 2
CORRECT_TO_RECOVER = 3


@dataclass(frozen=True)
class WeakState:
    is_weak: bool
    consecutive_correct: int


def weak_state(results: list[bool]) -> WeakState:
    """`results` are a Topic's answers, oldest first (True = correct), since it was last
    cleared. Recomputing from them always gives the same answer."""
    weak = False
    streak = 0
    window: list[bool] = []
    for correct in results:
        streak = streak + 1 if correct else 0
        window = [*window, correct][-WINDOW:]
        if weak:
            if streak >= CORRECT_TO_RECOVER:
                weak = False
                window = []
        elif window.count(False) >= WRONG_TO_BECOME_WEAK:
            weak = True
    return WeakState(weak, streak)
