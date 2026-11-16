"""The Study Session graph with a fake model, on an in-memory database."""

import json
import random
import uuid

import pytest
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.chat import models as _chat  # noqa: F401  (tables the FKs point to)
from app.chunks import models as _chunks  # noqa: F401
from app.db import Base
from app.spaces import models as _spaces  # noqa: F401
from app.students import models as _students  # noqa: F401
from app.study.graph import build_study_graph
from app.study.models import (
    Dispute,
    QuizAttempt,
    SessionQuestion,
    StudySession,
    WeakTopic,
)
from app.topics.models import Topic

SPACE = uuid.uuid4()
THREAD = uuid.uuid4()


class FakeModel:
    """Writes either kind of question (the right answer is "right") and grades a short
    answer by whether it says "right"."""

    def invoke(self, messages):
        system, human = messages[0].content, messages[1].content
        if system.startswith("You grade"):
            ok = "Student's answer: right" in human
            data = {"score": 1 if ok else 0, "confidence": 1, "feedback": "Noted."}
        elif "short-answer" in system:
            data = {"question": "What?", "answer": "right", "explanation": "Because."}
        else:
            data = {
                "question": "What is it?",
                "options": ["right", "b", "c", "d"],
                "answer": 0,
                "explanation": "Because.",
            }
        text = json.dumps(data)
        return type("R", (), {"content": text, "text": text})()


class UnsureGrader(FakeModel):
    """Grades every written answer as the given score and confidence."""

    def __init__(self, score, confidence):
        self.score, self.confidence = score, confidence

    def invoke(self, messages):
        data = {
            "score": self.score,
            "confidence": self.confidence,
            "feedback": "Maybe.",
        }
        text = json.dumps(data)
        return type("R", (), {"content": text, "text": text})()


def passage_finder(session, space_id, topic, avoid):
    return {
        "chunk_id": str(uuid.uuid4()),
        "source_type": "notes",
        "document": "Notes",
        "author": None,
        "page_or_section": "p. 1",
        "passage": "A passage.",
        "url": None,
    }


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(
        engine,
        tables=[
            Topic.__table__,
            StudySession.__table__,
            SessionQuestion.__table__,
            QuizAttempt.__table__,
            Dispute.__table__,
            WeakTopic.__table__,
        ],
    )
    return engine


def _start(engine, total=3, grader=None, kind="quiz"):
    with Session(engine) as s:
        topic = Topic(space_id=SPACE, name="Photosynthesis")
        s.add(topic)
        s.add(
            StudySession(
                id=(sid := uuid.uuid4()),
                space_id=SPACE,
                thread_id=THREAD,
                kind=kind,
                question_count=total,
                topic_ids=[str(topic.id)],
            )
        )
        s.commit()
        topic_id = topic.id
    graph = build_study_graph(
        lambda: Session(engine),
        passage_finder,
        FakeModel(),
        grader or FakeModel(),
        InMemorySaver(),
        random.Random(1),
    )
    config = {"configurable": {"thread_id": str(sid)}}
    graph.invoke(
        {
            "session_id": str(sid),
            "space_id": str(SPACE),
            "kind": kind,
            "topic_ids": [str(topic_id)],
            "total": total,
            "answered": 0,
            "difficulty": "medium",
            "recent": [],
            "previous_topic": None,
            "used_chunks": [],
        },
        config,
    )
    return graph, config, sid, topic_id


def _current(engine, sid):
    with Session(engine) as s:
        answered = select(QuizAttempt.question_id)
        return s.scalar(
            select(SessionQuestion)
            .where(
                SessionQuestion.session_id == sid,
                SessionQuestion.id.not_in(answered),
            )
            .order_by(SessionQuestion.position.desc())
        )


def _answer(engine, graph, config, sid, right: bool):
    q = _current(engine, sid)
    if q.question_type == "short_answer":
        choice = "right" if right else "wrong"
    else:
        # The options are shuffled; the key says which one is right.
        choice = q.answer_key if right else str((int(q.answer_key) + 1) % 4)
    graph.invoke(Command(resume=choice), config)


def test_the_graph_stops_at_the_first_question(db):
    _graph, _config, sid, _topic = _start(db)
    q = _current(db, sid)
    assert q.position == 1


def test_two_wrong_answers_make_the_topic_weak(db):
    graph, config, sid, topic = _start(db, total=5)
    _answer(db, graph, config, sid, False)
    with Session(db) as s:
        assert not s.get(WeakTopic, (SPACE, topic)).is_weak
    _answer(db, graph, config, sid, False)
    with Session(db) as s:
        assert s.get(WeakTopic, (SPACE, topic)).is_weak


def test_three_right_answers_recover_it(db):
    graph, config, sid, topic = _start(db, total=6)
    for right in (False, False, True, True, True):
        _answer(db, graph, config, sid, right)
    with Session(db) as s:
        assert not s.get(WeakTopic, (SPACE, topic)).is_weak


def test_the_session_finishes_with_a_score_and_adapts(db):
    graph, config, sid, _topic = _start(db, total=3)
    _answer(db, graph, config, sid, True)
    _answer(db, graph, config, sid, True)
    with Session(db) as s:
        assert s.get(StudySession, sid).difficulty == "hard"  # two right in a row
    _answer(db, graph, config, sid, False)
    with Session(db) as s:
        row = s.get(StudySession, sid)
        assert row.status == "finished" and row.score == 2
    assert _current(db, sid) is None


@pytest.fixture
def written(monkeypatch):
    """Every question is a written one, so the grader is always consulted."""
    monkeypatch.setattr("app.study.graph.MC_SHARE", 0.0)


def _pending(graph, config):
    state = graph.get_state(config)
    return [p.value for task in state.tasks for p in task.interrupts]


def _submit(graph, config, text="my answer"):
    graph.invoke(Command(resume=text), config)


def test_an_uncertain_grade_pauses_before_it_is_recorded(db, written):
    graph, config, _sid, _topic = _start(db, grader=UnsureGrader(0.5, 0.9))
    _submit(graph, config)
    assert _pending(graph, config)[0]["kind"] == "dispute"
    with Session(db) as s:
        assert s.scalar(select(QuizAttempt)) is None


def test_a_confident_grade_is_recorded_without_a_pause(db, written):
    graph, config, _sid, _topic = _start(db, grader=UnsureGrader(1.0, 0.95))
    _submit(graph, config)
    assert _pending(graph, config)[0]["kind"] == "answer"  # on to the next question
    with Session(db) as s:
        assert s.scalar(select(QuizAttempt)).graded_by == "auto"
        assert s.scalar(select(Dispute)) is None


def test_the_students_decision_overrides_the_grade(db, written):
    graph, config, _sid, _topic = _start(db, grader=UnsureGrader(0.2, 0.4))
    _submit(graph, config)
    _submit(graph, config, "correct")
    with Session(db) as s:
        attempt = s.scalar(select(QuizAttempt))
        assert attempt.is_correct and attempt.graded_by == "student"
        assert float(attempt.score) == 1.0
        dispute = s.scalar(select(Dispute))
        assert dispute.decision == "correct"
        assert float(dispute.auto_score) == pytest.approx(0.2)
        assert float(dispute.auto_confidence) == pytest.approx(0.4)


def test_a_decision_against_the_grade_counts_the_other_way(db, written):
    graph, config, _sid, _topic = _start(db, grader=UnsureGrader(0.9, 0.3))
    _submit(graph, config)
    _submit(graph, config, "incorrect")  # the grader was too kind
    with Session(db) as s:
        attempt = s.scalar(select(QuizAttempt))
        assert not attempt.is_correct and float(attempt.score) == 0.0


def test_a_decision_changes_the_weak_topic_record(db, written):
    # The grader marks every answer wrong, and so would make the Topic weak after two.
    graph, config, _sid, topic = _start(db, total=5, grader=UnsureGrader(0.0, 0.3))
    _submit(graph, config)
    _submit(graph, config, "correct")  # the Student overrules the first one
    _submit(graph, config)
    _submit(graph, config, "incorrect")
    with Session(db) as s:
        assert not s.get(WeakTopic, (SPACE, topic)).is_weak  # one wrong, one right
    _submit(graph, config)
    _submit(graph, config, "incorrect")  # a second wrong one in the last five
    with Session(db) as s:
        assert s.get(WeakTopic, (SPACE, topic)).is_weak


def test_not_sure_counts_as_not_right_and_is_kept(db, written):
    graph, config, _sid, _topic = _start(db, grader=UnsureGrader(0.9, 0.3))
    _submit(graph, config)
    _submit(graph, config, "unsure")
    with Session(db) as s:
        attempt = s.scalar(select(QuizAttempt))
        assert not attempt.is_correct and attempt.graded_by == "student"
        assert s.scalar(select(Dispute)).decision == "unsure"


def test_the_decision_feeds_the_difficulty(db, written):
    graph, config, sid, _topic = _start(db, total=4, grader=UnsureGrader(0.0, 0.3))
    for _ in range(2):
        _submit(graph, config)
        _submit(graph, config, "correct")
    with Session(db) as s:
        assert s.get(StudySession, sid).difficulty == "hard"  # two right in a row


def test_a_test_never_pauses_for_a_dispute(db, written):
    graph, config, _sid, _topic = _start(db, grader=UnsureGrader(0.5, 0.9), kind="test")
    _submit(graph, config)
    assert _pending(graph, config)[0]["kind"] == "answer"  # on to the next question
    with Session(db) as s:
        assert s.scalar(select(QuizAttempt)).graded_by == "auto"
        assert s.scalar(select(Dispute)) is None


def test_a_test_keeps_one_difficulty_and_finishes_with_a_score(db):
    graph, config, sid, _topic = _start(db, total=3, kind="test")
    for right in (True, True, False):
        _answer(db, graph, config, sid, right)
    with Session(db) as s:
        row = s.get(StudySession, sid)
        assert row.difficulty == "medium"  # a Quiz would have gone to hard
        assert row.status == "finished" and row.score == 2
