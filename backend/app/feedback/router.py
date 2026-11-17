import uuid

from fastapi import APIRouter, BackgroundTasks, Response
from sqlalchemy import select

from app.chat.models import Message, Thread
from app.db import SessionDep
from app.errors import ApiError
from app.feedback.models import Feedback
from app.feedback.schemas import FeedbackIn, FeedbackOut
from app.feedback.service import propose_style, send_to_langsmith
from app.spaces.models import Space
from app.students.dependencies import StudentDep

router = APIRouter(tags=["feedback"])


def _answer(session, student_id: uuid.UUID, message_id: uuid.UUID) -> Message:
    """One of the Student's own answers; anything else does not exist for them."""
    message = session.get(Message, message_id)
    thread = message and session.get(Thread, message.thread_id)
    space = thread and session.get(Space, thread.space_id)
    if message is None or message.role != "assistant" or space is None:
        raise ApiError(404, "message_not_found", "That does not exist.")
    if space.student_id != student_id:
        raise ApiError(404, "message_not_found", "That does not exist.")
    return message


@router.post("/messages/{message_id}/feedback", response_model=FeedbackOut)
def rate_answer(
    message_id: uuid.UUID,
    body: FeedbackIn,
    student: StudentDep,
    session: SessionDep,
    background: BackgroundTasks,
):
    """Rate an answer. A new rating replaces the old one; the rating goes to LangSmith
    with the answer's trace, and repeated "Too long" ratings propose a style change."""
    message = _answer(session, student.id, message_id)
    comment = (body.comment or "").strip() or None
    row = session.scalar(select(Feedback).where(Feedback.message_id == message.id))
    if row is None:
        row = Feedback(message_id=message.id, student_id=student.id, rating=body.rating)
        session.add(row)
    row.rating = body.rating
    row.comment = comment
    row.synced_to_langsmith_at = None
    session.flush()
    proposal = propose_style(session, student.id)
    session.commit()
    if message.trace_id:
        background.add_task(
            send_to_langsmith, row.id, message.trace_id, row.rating, row.comment
        )
    return FeedbackOut(
        message_id=str(message.id),
        rating=row.rating,
        comment=row.comment,
        style_proposed=proposal is not None,
    )


@router.delete("/messages/{message_id}/feedback", status_code=204)
def clear_rating(message_id: uuid.UUID, student: StudentDep, session: SessionDep):
    message = _answer(session, student.id, message_id)
    row = session.scalar(select(Feedback).where(Feedback.message_id == message.id))
    if row is not None:
        session.delete(row)
        session.commit()
    return Response(status_code=204)
