"""Repeated "Too long" ratings propose a style; only an approved one shapes answers."""

import uuid

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.chat import models as _chat  # noqa: F401  (tables the FKs point to)
from app.chat.prompt import build_prompt, preferences_text
from app.db import Base
from app.feedback.models import Feedback
from app.feedback.service import (
    PROPOSAL,
    THRESHOLD,
    approved_answer_styles,
    propose_style,
)
from app.profile.models import ProfileFact
from app.spaces import models as _spaces  # noqa: F401
from app.students import models as _students  # noqa: F401

STUDENT = uuid.uuid4()


@pytest.fixture
def session():
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine, tables=[Feedback.__table__, ProfileFact.__table__])
    with Session(engine) as s:
        yield s


def rate(session, rating="down", comment="Too long", student=STUDENT):
    row = Feedback(
        message_id=uuid.uuid4(), student_id=student, rating=rating, comment=comment
    )
    session.add(row)
    session.flush()
    return row


def test_fewer_than_the_threshold_proposes_nothing(session):
    for _ in range(THRESHOLD - 1):
        rate(session)
    assert propose_style(session, STUDENT) is None


def test_repeated_too_long_proposes_a_style_waiting_for_approval(session):
    for _ in range(THRESHOLD):
        rate(session)
    fact = propose_style(session, STUDENT)
    assert fact is not None
    assert (fact.text, fact.kind, fact.status, fact.origin) == (
        PROPOSAL,
        "style",
        "proposed",
        "feedback",
    )


def test_other_ratings_and_reasons_do_not_count(session):
    for _ in range(THRESHOLD):
        rate(session, "up", None)
        rate(session, "down", "Wrong source")
        rate(session, "down", None)
    assert propose_style(session, STUDENT) is None


def test_other_students_ratings_do_not_count(session):
    for _ in range(THRESHOLD):
        rate(session, student=uuid.uuid4())
    assert propose_style(session, STUDENT) is None


def test_each_rating_is_counted_once(session):
    for _ in range(THRESHOLD):
        rate(session)
    assert propose_style(session, STUDENT) is not None
    session.flush()
    # The Student said no (the fact is deleted); two more ratings are not enough.
    session.execute(ProfileFact.__table__.delete())
    for _ in range(THRESHOLD - 1):
        rate(session)
    assert propose_style(session, STUDENT) is None


def test_a_style_the_student_already_has_is_not_proposed_again(session):
    session.add(
        ProfileFact(
            student_id=STUDENT,
            kind="style",
            text=PROPOSAL,
            origin="feedback",
            status="approved",
        )
    )
    for _ in range(THRESHOLD):
        rate(session)
    assert propose_style(session, STUDENT) is None
    assert len(session.scalars(select(ProfileFact)).all()) == 1


def test_only_approved_feedback_styles_shape_answers(session):
    def fact(text, status, origin):
        session.add(
            ProfileFact(
                student_id=STUDENT,
                kind="style",
                text=text,
                status=status,
                origin=origin,
            )
        )

    fact("Waiting.", "proposed", "feedback")
    fact("For cards only.", "approved", "flashcard_edits")
    fact("Be brief.", "approved", "feedback")
    session.flush()
    assert approved_answer_styles(session, STUDENT) == ["Be brief."]


def test_preferences_reach_the_prompt():
    text = preferences_text("German", "short", ["Be brief."])
    prompt = build_prompt(preferences=text)
    assert "in German" in prompt
    assert "Keep answers short" in prompt
    assert "- Be brief." in prompt


def test_balanced_without_language_adds_nothing():
    assert preferences_text(None, "balanced", []) == ""
    assert build_prompt(preferences="") == build_prompt()
