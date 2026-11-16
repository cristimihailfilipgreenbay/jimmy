import uuid

from app.db import SessionDep
from app.errors import ApiError
from app.spaces.models import Space
from app.students.dependencies import StudentDep


def get_owned_space(session: SessionDep, student: StudentDep, space_id: uuid.UUID) -> Space:
    """A Space owned by another Student behaves as if it does not exist."""
    space = session.get(Space, space_id)
    if space is None or space.student_id != student.id:
        raise ApiError(404, "space_not_found", "That Study Space does not exist.")
    return space
