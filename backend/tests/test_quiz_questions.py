"""Parsing the model's questions and grades, and the multiple-choice grader."""

import random

import pytest

from app.study.questions import (
    ESSAY,
    MULTIPLE_CHOICE,
    SHORT_ANSWER,
    BadQuestion,
    Grade,
    generate_question,
    grade_essay,
    grade_multiple_choice,
    parse_essay_grade,
    parse_grade,
    parse_question,
    question_type_for,
    rubric_of,
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


ESSAY_Q = {
    "question": "Explain how the cell makes ATP from glucose.",
    "rubric": [
        "Glycolysis in the cytoplasm",
        "Krebs cycle",
        "Electron transport chain",
    ],
    "explanation": "The passage describes all three stages.",
}


def test_an_essay_keeps_its_rubric_as_the_answer_key():
    question = parse_question(ESSAY_Q, ESSAY)
    assert question.type == ESSAY and question.options is None
    assert rubric_of(question.answer_key) == ESSAY_Q["rubric"]


@pytest.mark.parametrize(
    "rubric", [None, "text", ["only one"], ["a", "b", "c", "d", "e", "f"], ["", "", ""]]
)
def test_an_essay_needs_three_to_five_rubric_lines(rubric):
    with pytest.raises(BadQuestion):
        parse_question({**ESSAY_Q, "rubric": rubric}, ESSAY)


def test_the_last_question_of_a_session_of_five_or_more_is_an_essay():
    rng = random.Random(1)
    assert question_type_for(5, 5, rng) == ESSAY
    assert question_type_for(10, 10, rng) == ESSAY
    assert all(question_type_for(n, 5, rng) != ESSAY for n in range(1, 5))


def test_a_short_session_has_no_essay():
    rng = random.Random(1)
    assert all(question_type_for(n, 4, rng) != ESSAY for n in range(1, 5))


RUBRIC = ["Glycolysis", "Krebs cycle", "Electron transport chain"]


def test_an_essay_scores_the_mean_of_its_criteria():
    grade = parse_essay_grade(
        {
            "criteria": [
                {"met": 1, "comment": "stated"},
                {"met": 0.5, "comment": "partly"},
                {"met": 0, "comment": "missing"},
            ],
            "confidence": 0.9,
            "feedback": "Good start.",
        },
        RUBRIC,
    )
    assert grade.score == pytest.approx(0.5)
    assert [c["criterion"] for c in grade.criteria] == RUBRIC
    assert grade.criteria[1]["comment"] == "partly"


def test_a_missing_criterion_counts_as_not_met():
    grade = parse_essay_grade(
        {"criteria": [{"met": 1, "comment": "ok"}], "confidence": 0.9}, RUBRIC
    )
    assert grade.score == pytest.approx(1 / 3)
    assert grade.criteria[2]["met"] == 0.0


def test_a_reply_without_criteria_is_zero_with_no_confidence():
    grade = parse_essay_grade({"feedback": "?"}, RUBRIC)
    assert grade.score == 0.0 and grade.confidence == 0.0


def test_an_unsure_essay_grade_goes_to_a_dispute():
    from app.study.routing import needs_dispute

    # Two of three criteria met is 0.67, close to the pass line.
    assert needs_dispute(2 / 3, 0.95)
    assert not needs_dispute(1.0, 0.95)


def test_grade_essay_uses_the_graders_reply():
    model = Scripted(
        '{"criteria": [{"met": 1, "comment": "a"}, {"met": 1, "comment": "b"},'
        ' {"met": 1, "comment": "c"}], "confidence": 0.9, "feedback": "Well done."}'
    )
    grade = grade_essay(
        model, question="Q?", rubric=RUBRIC, passage="p", answer="my essay"
    )
    assert grade.correct and grade.feedback == "Well done."


def test_grade_essay_survives_a_bad_reply():
    grade = grade_essay(
        Scripted("not json"), question="Q?", rubric=RUBRIC, passage="p", answer="x"
    )
    assert grade.score == 0.0 and grade.confidence == 0.0
