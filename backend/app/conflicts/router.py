import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select

from app.conflicts.models import Conflict
from app.conflicts.schemas import ConflictOut
from app.db import SessionDep
from app.errors import ApiError
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space

router = APIRouter(tags=["conflicts"])

SpaceDep = Annotated[Space, Depends(get_owned_space)]


@router.get("/spaces/{space_id}/conflicts", response_model=list[ConflictOut])
def list_conflicts(space: SpaceDep, session: SessionDep):
    return session.scalars(
        select(Conflict)
        .where(Conflict.space_id == space.id)
        .order_by(Conflict.decided_at.desc())
    )


@router.delete("/spaces/{space_id}/conflicts/{conflict_id}", status_code=204)
def forget_conflict(space: SpaceDep, conflict_id: uuid.UUID, session: SessionDep):
    """Forget a decision, so the Student is asked again."""
    row = session.get(Conflict, conflict_id)
    if row is None or row.space_id != space.id:
        raise ApiError(404, "conflict_not_found", "That decision does not exist.")
    session.delete(row)
    session.commit()
    return Response(status_code=204)
