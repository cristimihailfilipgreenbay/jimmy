import json
import uuid
from collections.abc import Iterator
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import case, func, select, tuple_

from app.chat.agent import ModelNotConfigured, build_agent
from app.chat.dependencies import ThreadDep
from app.chat.models import Message, Thread
from app.chat.prompt import preferences_text
from app.chat.runner import (
    config_for,
    history_messages,
    pending_interrupt,
    redirect_turn,
    resume_turn,
    run_turn,
)
from app.chat.schemas import (
    MessageIn,
    MessageOut,
    ThreadItemOut,
    ThreadOut,
    ThreadRename,
)
from app.chat.titles import clean_custom_title, trim_title
from app.chat.tools import RunSources
from app.checkpointer import get_checkpointer
from app.conflicts.service import DECISIONS
from app.db import SessionDep
from app.errors import ApiError
from app.feedback.models import Feedback
from app.feedback.service import approved_answer_styles
from app.guardrails.classify import OFF_TOPIC, check_input
from app.learned.models import LearnedMaterial
from app.pagination import (
    CursorPage,
    CursorQuery,
    LimitQuery,
    decode_cursor,
    next_cursor,
)
from app.settings.service import load_tutor_settings
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space
from app.students.dependencies import StudentDep
from app.students.models import Profile

router = APIRouter(tags=["chat"])

SpaceDep = Annotated[Space, Depends(get_owned_space)]


def _activity():
    """How many messages each chat has and when the last one was written."""
    return (
        select(
            Message.thread_id.label("thread_id"),
            func.count().label("messages"),
            func.max(Message.created_at).label("last"),
        )
        .group_by(Message.thread_id)
        .subquery()
    )


def _item(thread: Thread, messages: int, last: datetime) -> ThreadItemOut:
    return ThreadItemOut(
        id=thread.id,
        title=thread.custom_title or thread.title,
        created_at=thread.created_at,
        updated_at=last,
        message_count=messages,
    )


@router.get("/spaces/{space_id}/threads", response_model=CursorPage[ThreadItemOut])
def list_threads(
    space: SpaceDep,
    session: SessionDep,
    limit: LimitQuery = 20,
    cursor: CursorQuery = None,
):
    """The Space's chats, the most recently active first, twenty at a time. A chat with
    no message yet is not listed."""
    activity = _activity()
    mine = (Thread.space_id == space.id, Thread.kind == "chat")
    older = ()
    if cursor:
        last, thread_id = decode_cursor(cursor, 2)
        try:
            older = (
                tuple_(activity.c.last, Thread.id)
                < tuple_(datetime.fromisoformat(last), uuid.UUID(thread_id)),
            )
        except ValueError as exc:
            raise ApiError(
                422, "invalid_cursor", "That page link is not valid."
            ) from exc
    rows = session.execute(
        select(Thread, activity.c.messages, activity.c.last)
        .join(activity, activity.c.thread_id == Thread.id)
        .where(*mine, *older)
        .order_by(activity.c.last.desc(), Thread.id.desc())
        .limit(limit + 1)
    ).all()
    total = session.scalar(
        select(func.count())
        .select_from(Thread)
        .join(activity, activity.c.thread_id == Thread.id)
        .where(*mine)
    )
    return CursorPage(
        items=[_item(t, n, last) for t, n, last in rows[:limit]],
        next_cursor=next_cursor(
            rows, limit, lambda r: [r[2].isoformat(), str(r[0].id)]
        ),
        total=total,
    )


def _chat(thread: Thread) -> Thread:
    if thread.kind != "chat":
        raise ApiError(404, "thread_not_found", "That chat does not exist.")
    return thread


@router.patch("/threads/{thread_id}", response_model=ThreadItemOut)
def rename_thread(body: ThreadRename, thread: ThreadDep, session: SessionDep):
    """Rename a chat. An empty name goes back to using the first question."""
    _chat(thread).custom_title = clean_custom_title(body.title)
    session.commit()
    messages, last = session.execute(
        select(func.count(), func.max(Message.created_at)).where(
            Message.thread_id == thread.id
        )
    ).one()
    return _item(thread, messages, last or thread.created_at)


@router.delete("/threads/{thread_id}", status_code=204)
def delete_thread(thread: ThreadDep, session: SessionDep):
    """Delete a chat and its messages. Notes, Flashcards and Weak Topics stay."""
    _chat(thread)
    thread_id = thread.id
    session.delete(thread)
    session.commit()
    # What the run saved at its pauses goes with it.
    get_checkpointer().delete_thread(str(thread_id))
    return Response(status_code=204)


@router.post("/spaces/{space_id}/threads", response_model=ThreadOut, status_code=201)
def create_thread(space: SpaceDep, session: SessionDep):
    thread = Thread(space_id=space.id, kind="chat")
    session.add(thread)
    session.commit()
    session.refresh(thread)
    return thread


def _turn_order():
    """Within one moment, the question comes before its answer."""
    return case((Message.role == "user", 0), else_=1)


@router.get("/threads/{thread_id}/messages", response_model=CursorPage[MessageOut])
def list_messages(
    thread: ThreadDep,
    session: SessionDep,
    limit: LimitQuery = 30,
    cursor: CursorQuery = None,
):
    """The newest messages first: the page is the latest `limit` messages, oldest of them
    first, and `next_cursor` fetches the ones before it."""
    mine = Message.thread_id == thread.id
    key = tuple_(Message.created_at, _turn_order(), Message.id)
    older = ()
    if cursor:
        created, turn, message_id = decode_cursor(cursor, 3)
        try:
            older = (
                key
                < tuple_(
                    datetime.fromisoformat(created), int(turn), uuid.UUID(message_id)
                ),
            )
        except ValueError as exc:
            raise ApiError(
                422, "invalid_cursor", "That page link is not valid."
            ) from exc
    rows = list(
        session.scalars(
            select(Message)
            .where(mine, *older)
            .order_by(
                Message.created_at.desc(), _turn_order().desc(), Message.id.desc()
            )
            .limit(limit + 1)
        )
    )
    page = list(reversed(rows[:limit]))
    ratings = {
        f.message_id: f
        for f in session.scalars(
            select(Feedback).where(Feedback.message_id.in_([m.id for m in page]))
        )
    }
    items = []
    for m in page:
        out = MessageOut.model_validate(m)
        rated = ratings.get(m.id)
        out.rating = rated.rating if rated else None
        out.rating_comment = rated.comment if rated else None
        items.append(out)
    return CursorPage(
        items=items,
        next_cursor=next_cursor(
            rows,
            limit,
            lambda m: [
                m.created_at.isoformat(),
                str(0 if m.role == "user" else 1),
                str(m.id),
            ],
        ),
        total=session.scalar(select(func.count()).select_from(Message).where(mine)),
    )


def _sse(events: Iterator) -> Iterator[str]:
    for event in events:
        yield f"event: {event.type}\ndata: {json.dumps(event.data)}\n\n"


@router.post("/threads/{thread_id}/messages")
def send_message(
    body: MessageIn, thread: ThreadDep, student: StudentDep, session: SessionDep
):
    """Store the question and stream the answer as server-sent events."""
    earlier = list(
        session.scalars(
            select(Message)
            .where(Message.thread_id == thread.id)
            .order_by(Message.created_at, Message.role.desc())
        )
    )
    space = session.get(Space, thread.space_id)
    profile = session.get(Profile, student.id)
    verdict = check_input(
        body.content, space.name if space else "", profile and profile.course
    )
    if verdict.blocked:
        raise ApiError(
            429,
            "guardrail_blocked",
            "Jimmy can't help with that message. Ask a study question instead.",
        )
    if not earlier:
        thread.title = trim_title(body.content)
    question = Message(thread_id=thread.id, role="user", content=body.content)
    session.add(question)
    session.commit()
    if verdict.category == OFF_TOPIC:
        return StreamingResponse(
            _sse(redirect_turn(thread_id=thread.id, reply=verdict.reply)),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    events = run_turn(
        thread_id=thread.id,
        space_id=thread.space_id,
        history=history_messages(earlier),
        question=body.content,
        library=bool(space and space.library_enabled),
        web=bool(profile and profile.web_search_enabled),
        space_name=space.name if space else "",
        learned=_has_learned(session, thread.space_id),
        checkpointer=get_checkpointer(),
        turn_id=question.id,
        preferences=_preferences(session, student.id, profile),
        tutor=load_tutor_settings(session, student.id),
    )
    return StreamingResponse(
        _sse(events),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _preferences(session, student_id, profile) -> str:
    """The Profile's language and length, and the style changes the Student approved."""
    return preferences_text(
        profile.language if profile else None,
        profile.explanation_style if profile else "balanced",
        approved_answer_styles(session, student_id),
    )


def _has_learned(session, space_id) -> bool:
    return (
        session.query(LearnedMaterial.id).filter_by(space_id=space_id).first()
        is not None
    )


def resume_chat(
    interrupt_id: str,
    decision: str,
    thread: Thread,
    student,
    session,
) -> StreamingResponse:
    """Answer a pause in a chat. The turn that paused is always the latest question.

    Called by `POST /threads/{thread_id}/resume` (app/topics/router.py), which answers
    every kind of pause."""
    nothing = ApiError(409, "nothing_to_resume", "That question was already answered.")
    question = session.scalar(
        select(Message)
        .where(Message.thread_id == thread.id, Message.role == "user")
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    if question is None:
        raise nothing
    space = session.get(Space, thread.space_id)
    profile = session.get(Profile, student.id)
    flags = {
        "library": bool(space and space.library_enabled),
        "web": bool(profile and profile.web_search_enabled),
        "learned": _has_learned(session, thread.space_id),
        "preferences": _preferences(session, student.id, profile),
        "tutor": load_tutor_settings(session, student.id),
    }
    checkpointer = get_checkpointer()
    try:
        agent = build_agent(
            thread.space_id, RunSources(), checkpointer=checkpointer, **flags
        )
    except ModelNotConfigured as exc:
        raise ApiError(502, "upstream_unavailable", str(exc)) from exc
    pending = pending_interrupt(
        agent, config_for(thread.id, question.id, thread.space_id)
    )
    if pending is None or pending[0] != interrupt_id:
        raise nothing
    if pending[1].get("kind") == "conflict" and decision not in DECISIONS:
        raise ApiError(
            422, "invalid_decision", "Choose keep_notes, accept_other or unsure."
        )
    events = resume_turn(
        thread_id=thread.id,
        turn_id=question.id,
        space_id=thread.space_id,
        decision=decision,
        space_name=space.name if space else "",
        checkpointer=checkpointer,
        **flags,
    )
    return StreamingResponse(
        _sse(events),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
