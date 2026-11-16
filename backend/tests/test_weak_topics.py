"""The Weak Topic rule, Topic selection and difficulty."""

import random
import uuid

from app.study.selection import next_difficulty, pick_topic
from app.study.weak import weak_state

T, F = True, False


def test_two_wrong_in_the_last_five_makes_a_topic_weak():
    assert not weak_state([F]).is_weak
    assert weak_state([F, F]).is_weak
    assert weak_state([F, T, T, F]).is_weak


def test_two_wrong_answers_more_than_five_apart_do_not_count():
    assert not weak_state([F, T, T, T, T, F]).is_weak


def test_three_correct_in_a_row_recover_a_weak_topic():
    assert weak_state([F, F, T, T]).is_weak
    state = weak_state([F, F, T, T, T])
    assert not state.is_weak
    assert state.consecutive_correct == 3


def test_a_wrong_answer_resets_the_streak():
    assert weak_state([F, F, T, T, F, T, T]).is_weak


def test_recovery_forgets_the_old_mistakes():
    # Without the reset, F F in the window would make it weak again at once.
    assert not weak_state([F, F, T, T, T, T]).is_weak
    assert not weak_state([F, F, T, T, T, F]).is_weak
    assert weak_state([F, F, T, T, T, F, F]).is_weak


def test_no_answers_is_not_weak():
    assert not weak_state([]).is_weak


def test_a_weak_topic_is_picked_more_often():
    a, b, c = (uuid.uuid4() for _ in range(3))
    rng = random.Random(1)
    picks = [pick_topic([a, b, c], {a}, None, rng) for _ in range(3000)]
    assert picks.count(a) > 1.8 * picks.count(b)


def test_the_same_topic_is_not_repeated_when_there_is_a_choice():
    a, b = uuid.uuid4(), uuid.uuid4()
    rng = random.Random(2)
    assert all(pick_topic([a, b], set(), a, rng) == b for _ in range(50))
    assert pick_topic([a], set(), a, rng) == a


def test_difficulty_follows_how_the_student_is_doing():
    assert next_difficulty("medium", [T, T]) == "hard"
    assert next_difficulty("hard", [T, T, T]) == "hard"
    assert next_difficulty("medium", [T, F]) == "easy"
    assert next_difficulty("easy", [F]) == "easy"
    assert next_difficulty("medium", [T]) == "medium"
