import uuid
from typing import Annotated

from fastapi import Depends

from app.db import SessionDep
from app.errors import ApiError
from app.spaces.models import Space
from app.students.dependencies import StudentDep
from app.study.models import StudySession


def get_owned_session(
    session: SessionDep, student: StudentDep, session_id: uuid.UUID
) -> StudySession:
    """A session in another Student's Space behaves as if it does not exist."""
    row = session.get(StudySession, session_id)
    space = session.get(Space, row.space_id) if row else None
    if row is None or space is None or space.student_id != student.id:
        raise ApiError(404, "session_not_found", "That session does not exist.")
    return row


StudySessionDep = Annotated[StudySession, Depends(get_owned_session)]
