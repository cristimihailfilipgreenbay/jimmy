import uuid
from typing import Annotated

from fastapi import Depends

from app.chat.models import Thread
from app.db import SessionDep
from app.errors import ApiError
from app.spaces.models import Space
from app.students.dependencies import StudentDep


def get_owned_thread(
    session: SessionDep, student: StudentDep, thread_id: uuid.UUID
) -> Thread:
    """A thread in another Student's Space behaves as if it does not exist."""
    thread = session.get(Thread, thread_id)
    space = session.get(Space, thread.space_id) if thread else None
    if thread is None or space is None or space.student_id != student.id:
        raise ApiError(404, "thread_not_found", "That conversation does not exist.")
    return thread


ThreadDep = Annotated[Thread, Depends(get_owned_thread)]
