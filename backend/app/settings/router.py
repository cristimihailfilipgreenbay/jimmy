import uuid
from datetime import datetime

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.chat.models import Message, Thread
from app.config import get_settings
from app.db import SessionDep
from app.documents.models import Document
from app.errors import ApiError
from app.settings.models import Settings
from app.settings.openrouter import ModelListUnavailable, fetch_models
from app.settings.schemas import (
    ModelOut,
    SettingsIn,
    SettingsOut,
    ToolOut,
    UsageItem,
    UsageOut,
)
from app.settings.service import TOOLS, resolve
from app.spaces.models import Space
from app.students.dependencies import StudentDep

router = APIRouter(tags=["settings"])


def _out(session, student_id: uuid.UUID, row: Settings | None) -> SettingsOut:
    tutor = resolve(row)
    env = get_settings()
    # Notes are the only chunks a Student adds; once they exist the model is locked.
    locked = (
        session.scalar(
            select(Document.id)
            .join(Space, Space.id == Document.space_id)
            .where(Space.student_id == student_id)
            .limit(1)
        )
        is not None
    )
    return SettingsOut(
        tutor_model=tutor.tutor_model,
        background_model=tutor.background_model,
        temperature=tutor.temperature,
        max_tokens=tutor.max_tokens,
        tools=[
            ToolOut(
                name=name,
                label=label,
                description=description,
                enabled=name not in tutor.disabled,
            )
            for name, (label, description) in TOOLS.items()
        ],
        show_usage=tutor.show_usage,
        embedding_model=env.embedding_model,
        embedding_dimensions=env.embedding_dimensions,
        embedding_locked=locked,
    )


@router.get("/settings", response_model=SettingsOut)
def get_student_settings(student: StudentDep, session: SessionDep):
    return _out(session, student.id, session.get(Settings, student.id))


@router.put("/settings", response_model=SettingsOut)
def update_settings(body: SettingsIn, student: StudentDep, session: SessionDep):
    unknown = sorted(set(body.tools or {}) - set(TOOLS))
    if unknown:
        raise ApiError(
            422, "unknown_tool", f"Jimmy has no switchable tool called {unknown[0]}."
        )
    row = session.get(Settings, student.id)
    if row is None:
        row = Settings(student_id=student.id, tools={})
        session.add(row)
    if body.tutor_model is not None:
        row.tutor_model = body.tutor_model.strip() or None
    if body.background_model is not None:
        row.background_model = body.background_model.strip() or None
    if body.temperature is not None:
        row.temperature = body.temperature
    if body.max_tokens is not None:
        row.max_tokens = body.max_tokens
    if body.tools is not None:
        # A new dict, so the JSON column notices the change.
        row.tools = {**(row.tools or {}), **body.tools}
    if body.show_usage is not None:
        row.show_usage = body.show_usage
    session.commit()
    return _out(session, student.id, row)


@router.get("/settings/models", response_model=list[ModelOut])
def list_models(student: StudentDep):
    """The models OpenRouter offers, for the pickers."""
    try:
        return fetch_models()
    except ModelListUnavailable as exc:
        raise ApiError(
            502, "upstream_unavailable", "OpenRouter's model list is not available."
        ) from exc


@router.get("/usage", response_model=UsageOut)
def usage(
    student: StudentDep,
    session: SessionDep,
    space_id: uuid.UUID | None = None,
    since: datetime | None = None,
    limit: int = Query(20, ge=1, le=100),
):
    """Tokens and estimated cost of the Student's answers, newest first, optionally for
    one Study Space and from a date on."""
    mine = (
        Space.student_id == student.id,
        Message.role == "assistant",
        *([Thread.space_id == space_id] if space_id else []),
        *([Message.created_at >= since] if since else []),
    )
    base = (
        select(Message)
        .join(Thread, Thread.id == Message.thread_id)
        .join(Space, Space.id == Thread.space_id)
        .where(*mine)
    )
    total, answers = session.execute(
        select(func.coalesce(func.sum(Message.cost_usd), 0), func.count())
        .join(Thread, Thread.id == Message.thread_id)
        .join(Space, Space.id == Thread.space_id)
        .where(*mine)
    ).one()
    rows = session.scalars(base.order_by(Message.created_at.desc()).limit(limit)).all()
    items = []
    for m in rows:
        question = session.scalar(
            select(Message.content)
            .where(
                Message.thread_id == m.thread_id,
                Message.role == "user",
                Message.created_at <= m.created_at,
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        items.append(
            UsageItem(
                message_id=str(m.id),
                question=question or "",
                model=m.model,
                tools=m.tools or [],
                tokens_in=m.tokens_in,
                tokens_out=m.tokens_out,
                cost_usd=float(m.cost_usd) if m.cost_usd is not None else None,
                created_at=m.created_at,
            )
        )
    return UsageOut(total_usd=float(total), answers=answers, items=items)
