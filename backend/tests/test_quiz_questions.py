"""Parsing the model's questions and grades, and the multiple-choice grader."""

import random

import pytest

from app.study.questions import (
    MULTIPLE_CHOICE,
    SHORT_ANSWER,
    BadQuestion,
    Grade,
    generate_question,
    grade_multiple_choice,
    parse_grade,
    parse_question,
)

MC = {
    "question": "Where does the Calvin cycle run?",
    "options": ["Stroma", "Thylakoid", "Matrix", "Cytosol"],
    "answer": 0,
    "explanation": "The passage says the stroma.",
}


def test_a_multiple_choice_question_keeps_its_right_answer_after_shuffling():
    for seed in range(20):
        q = parse_question(MC, MULTIPLE_CHOICE, random.Random(seed))
        assert q.options[int(q.answer_key)] == "Stroma"
        assert sorted(q.options) == sorted(MC["options"])


@pytest.mark.parametrize(
    "change",
    [
        {"options": ["a", "b", "c"]},
        {"options": ["a", "a", "b", "c"]},
        {"options": ["a", "b", "c", ""]},
        {"answer": 4},
        {"answer": "0"},
        {"answer": True},
        {"question": ""},
        {"explanation": ""},
    ],
)
def test_a_malformed_multiple_choice_question_is_rejected(change):
    with pytest.raises(BadQuestion):
        parse_question({**MC, **change}, MULTIPLE_CHOICE)


def test_a_short_answer_question_needs_a_reference_answer():
    ok = {"question": "Q?", "answer": "A.", "explanation": "E."}
    q = parse_question(ok, SHORT_ANSWER)
    assert q.options is None and q.answer_key == "A."
    with pytest.raises(BadQuestion):
        parse_question({**ok, "answer": ""}, SHORT_ANSWER)


def test_multiple_choice_is_graded_by_option_number():
    assert grade_multiple_choice("2", " 2 ").correct
    assert not grade_multiple_choice("2", "1").correct
    assert grade_multiple_choice("2", "1").confidence == 1.0


def test_a_grade_is_clamped_and_a_missing_score_is_zero():
    assert parse_grade({"score": 3, "confidence": -1}) == Grade(1.0, 0.0, "")
    assert parse_grade({}).score == 0.0
    assert parse_grade({"score": "x"}).score == 0.0


def test_the_pass_line():
    assert Grade(0.6, 1, "").correct
    assert not Grade(0.59, 1, "").correct


class Scripted:
    def __init__(self, *replies):
        self.replies = list(replies)
        self.calls = 0

    def invoke(self, _messages):
        reply = self.replies[min(self.calls, len(self.replies) - 1)]
        self.calls += 1
        return type("R", (), {"content": reply, "text": reply})()


def test_a_bad_reply_is_retried_once():
    model = Scripted(
        "not json", '{"question": "Q?", "answer": "A", "explanation": "E"}'
    )
    q = generate_question(
        model, passage="p", topic="t", qtype=SHORT_ANSWER, difficulty="easy"
    )
    assert q.prompt == "Q?" and model.calls == 2


def test_two_bad_replies_give_up():
    model = Scripted("not json")
    with pytest.raises(BadQuestion):
        generate_question(
            model, passage="p", topic="t", qtype=SHORT_ANSWER, difficulty="easy"
        )
    assert model.calls == 2
