import json
from collections.abc import Iterator
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.chat.agent import ModelNotConfigured, build_agent
from app.chat.dependencies import ThreadDep
from app.chat.models import Message, Thread
from app.chat.runner import (
    config_for,
    history_messages,
    pending_interrupt,
    redirect_turn,
    resume_turn,
    run_turn,
)
from app.chat.schemas import MessageIn, MessageOut, ResumeIn, ThreadOut
from app.chat.tools import RunSources
from app.checkpointer import get_checkpointer
from app.conflicts.service import DECISIONS
from app.db import SessionDep
from app.errors import ApiError
from app.guardrails.classify import OFF_TOPIC, check_input
from app.learned.models import LearnedMaterial
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space
from app.students.dependencies import StudentDep
from app.students.models import Profile

router = APIRouter(tags=["chat"])

SpaceDep = Annotated[Space, Depends(get_owned_space)]


@router.get("/spaces/{space_id}/threads", response_model=list[ThreadOut])
def list_threads(space: SpaceDep, session: SessionDep):
    return session.scalars(
        select(Thread)
        .where(Thread.space_id == space.id, Thread.kind == "chat")
        .order_by(Thread.created_at.desc())
    )


@router.post("/spaces/{space_id}/threads", response_model=ThreadOut, status_code=201)
def create_thread(space: SpaceDep, session: SessionDep):
    thread = Thread(space_id=space.id, kind="chat")
    session.add(thread)
    session.commit()
    session.refresh(thread)
    return thread


@router.get("/threads/{thread_id}/messages", response_model=list[MessageOut])
def list_messages(thread: ThreadDep, session: SessionDep):
    return session.scalars(
        select(Message)
        .where(Message.thread_id == thread.id)
        .order_by(Message.created_at, Message.role.desc())
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
        thread.title = body.content.strip().replace("\n", " ")[:60]
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
    )
    return StreamingResponse(
        _sse(events),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _has_learned(session, space_id) -> bool:
    return (
        session.query(LearnedMaterial.id).filter_by(space_id=space_id).first()
        is not None
    )


@router.post("/threads/{thread_id}/resume")
def resume(body: ResumeIn, thread: ThreadDep, student: StudentDep, session: SessionDep):
    """Answer a pause. The turn that paused is always the thread's latest question."""
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
    if pending is None or pending[0] != body.interrupt_id:
        raise nothing
    if pending[1].get("kind") == "conflict" and body.decision not in DECISIONS:
        raise ApiError(
            422, "invalid_decision", "Choose keep_notes, accept_other or unsure."
        )
    events = resume_turn(
        thread_id=thread.id,
        turn_id=question.id,
        space_id=thread.space_id,
        decision=body.decision,
        space_name=space.name if space else "",
        checkpointer=checkpointer,
        **flags,
    )
    return StreamingResponse(
        _sse(events),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
