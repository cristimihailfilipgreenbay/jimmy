"""Database helpers for Study Sessions and Weak Topics."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.study.models import QuizAttempt, SessionQuestion, StudySession, WeakTopic
from app.study.weak import weak_state
from app.topics.models import Topic


def refresh_weak_topic(session: Session, space_id: uuid.UUID, topic_id: uuid.UUID):
    """Recompute one Topic's state from its answers since it was last cleared."""
    row = session.get(WeakTopic, (space_id, topic_id))
    cleared = row.cleared_at if row else None
    query = (
        select(QuizAttempt.is_correct)
        .join(SessionQuestion, SessionQuestion.id == QuizAttempt.question_id)
        .join(StudySession, StudySession.id == SessionQuestion.session_id)
        .where(
            StudySession.space_id == space_id,
            SessionQuestion.topic_id == topic_id,
        )
        .order_by(QuizAttempt.created_at, SessionQuestion.position)
    )
    if cleared is not None:
        query = query.where(QuizAttempt.created_at > cleared)
    state = weak_state(list(session.scalars(query)))
    if row is None:
        row = WeakTopic(space_id=space_id, topic_id=topic_id)
        session.add(row)
    row.is_weak = state.is_weak
    row.consecutive_correct = state.consecutive_correct
    row.updated_at = datetime.now(UTC)
    return row


def weak_topic_ids(session: Session, space_id: uuid.UUID) -> set[uuid.UUID]:
    return set(
        session.scalars(
            select(WeakTopic.topic_id).where(
                WeakTopic.space_id == space_id, WeakTopic.is_weak.is_(True)
            )
        )
    )


def clear_weak_topic(session: Session, space_id: uuid.UUID, topic_id: uuid.UUID):
    """The Student says the Topic is fine: its earlier answers stop counting."""
    row = session.get(WeakTopic, (space_id, topic_id))
    if row is None:
        row = WeakTopic(space_id=space_id, topic_id=topic_id)
        session.add(row)
    row.is_weak = False
    row.consecutive_correct = 0
    row.cleared_at = datetime.now(UTC)
    row.updated_at = row.cleared_at


def topic_names(session: Session, ids: list[uuid.UUID]) -> dict[uuid.UUID, str]:
    return dict(
        session.execute(select(Topic.id, Topic.name).where(Topic.id.in_(ids))).all()
    )
