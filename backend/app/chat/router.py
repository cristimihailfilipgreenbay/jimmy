import json
from collections.abc import Iterator
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.chat.dependencies import ThreadDep
from app.chat.models import Message, Thread
from app.chat.runner import history_messages, run_turn
from app.chat.schemas import MessageIn, MessageOut, ThreadOut
from app.db import SessionDep
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
    if not earlier:
        thread.title = body.content.strip().replace("\n", " ")[:60]
    space = session.get(Space, thread.space_id)
    profile = session.get(Profile, student.id)
    session.add(Message(thread_id=thread.id, role="user", content=body.content))
    session.commit()
    events = run_turn(
        thread_id=thread.id,
        space_id=thread.space_id,
        history=history_messages(earlier),
        question=body.content,
        library=bool(space and space.library_enabled),
        web=bool(profile and profile.web_search_enabled),
    )
    return StreamingResponse(
        _sse(events),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
