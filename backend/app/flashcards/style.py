"""The Student's approved card styles, and proposing a new one from their edits."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.profile.models import ProfileFact

MAX_STYLES = 5
ORIGIN = "flashcard_edits"


def approved_styles(session: Session, student_id: uuid.UUID) -> list[str]:
    """The newest approved card styles; only these shape a new batch."""
    rows = session.scalars(
        select(ProfileFact.text)
        .where(
            ProfileFact.student_id == student_id,
            ProfileFact.kind == "style",
            ProfileFact.origin == ORIGIN,
            ProfileFact.status == "approved",
        )
        .order_by(ProfileFact.created_at.desc())
        .limit(MAX_STYLES)
    )
    return list(rows)


def propose_style(
    session: Session, student_id: uuid.UUID, text: str
) -> ProfileFact | None:
    """Record a style the edits show, waiting for the Student's Approval.

    A style the Student already has (approved or waiting) is not proposed again. One
    proposal waits at a time: a newer one replaces it."""
    if not text:
        return None
    facts = list(
        session.scalars(
            select(ProfileFact).where(
                ProfileFact.student_id == student_id,
                ProfileFact.kind == "style",
                ProfileFact.origin == ORIGIN,
            )
        )
    )
    if any(f.text.casefold() == text.casefold() for f in facts):
        return None
    waiting = next((f for f in facts if f.status == "proposed"), None)
    if waiting:
        waiting.text = text
        return waiting
    fact = ProfileFact(
        student_id=student_id, kind="style", text=text, origin=ORIGIN, status="proposed"
    )
    session.add(fact)
    return fact
