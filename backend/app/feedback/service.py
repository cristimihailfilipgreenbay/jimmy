"""Turning repeated feedback into a proposed Profile style change, and LangSmith sync."""

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.feedback.models import Feedback
from app.profile.models import ProfileFact

log = logging.getLogger(__name__)

ORIGIN = "feedback"
# The reason chip on a 👎 that is about style, not about being wrong.
TOO_LONG = "Too long"
# How many 👎 for the same style reason it takes to propose a change.
THRESHOLD = 3
PROPOSAL = "Keep explanations short and to the point."


def propose_style(session: Session, student_id: uuid.UUID) -> ProfileFact | None:
    """Propose a shorter style after `THRESHOLD` uncounted "Too long" ratings.

    Each rating is counted once. A style the Student already has (approved or waiting)
    is not proposed again. Only an approved style shapes later answers."""
    rows = list(
        session.scalars(
            select(Feedback).where(
                Feedback.student_id == student_id,
                Feedback.rating == "down",
                Feedback.comment == TOO_LONG,
                Feedback.proposed_at.is_(None),
            )
        )
    )
    if len(rows) < THRESHOLD:
        return None
    now = datetime.now(UTC)
    for row in rows:
        row.proposed_at = now
    existing = session.scalar(
        select(ProfileFact.id).where(
            ProfileFact.student_id == student_id,
            ProfileFact.kind == "style",
            ProfileFact.origin == ORIGIN,
            ProfileFact.text == PROPOSAL,
        )
    )
    if existing:
        return None
    fact = ProfileFact(
        student_id=student_id,
        kind="style",
        text=PROPOSAL,
        origin=ORIGIN,
        status="proposed",
    )
    session.add(fact)
    return fact


def approved_answer_styles(session: Session, student_id: uuid.UUID) -> list[str]:
    """The approved styles that came from feedback; they shape the Tutor's answers."""
    return list(
        session.scalars(
            select(ProfileFact.text)
            .where(
                ProfileFact.student_id == student_id,
                ProfileFact.kind == "style",
                ProfileFact.origin == ORIGIN,
                ProfileFact.status == "approved",
            )
            .order_by(ProfileFact.created_at)
        )
    )


def send_to_langsmith(
    feedback_id: uuid.UUID, trace_id: str, rating: str, comment
) -> None:
    """Send a rating to LangSmith as feedback on the answer's trace. Never raises."""
    settings = get_settings()
    if not (settings.langsmith_tracing and settings.langsmith_api_key):
        return
    from langsmith import Client

    from app.db import engine

    try:
        Client(api_key=settings.langsmith_api_key).create_feedback(
            run_id=trace_id,
            key="user_rating",
            score=1 if rating == "up" else 0,
            value=rating,
            comment=comment,
        )
        with Session(engine) as session:
            row = session.get(Feedback, feedback_id)
            if row:
                row.synced_to_langsmith_at = datetime.now(UTC)
                session.commit()
    except Exception:
        log.warning("Could not send feedback to LangSmith", exc_info=True)
