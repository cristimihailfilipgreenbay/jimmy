"""Background jobs: a row per piece of work, so the Student can be told how it went."""

import uuid
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import engine
from app.jobs.models import Job


def start_job(space_id: uuid.UUID, kind: str, payload: dict) -> uuid.UUID | None:
    """Record running work. None when the Study Space no longer exists."""
    with Session(engine) as session:
        job = Job(space_id=space_id, kind=kind, status="running", payload=payload)
        session.add(job)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            return None
        return job.id


def finish_job(
    job_id: uuid.UUID, status: str, message: str, payload: dict | None = None
) -> None:
    """Close a job. A job deleted with its Study Space is skipped quietly."""
    with Session(engine) as session:
        job = session.get(Job, job_id)
        if job is None:
            return
        job.status = status
        job.message = message
        if payload:
            job.payload = {**job.payload, **payload}
        job.finished_at = datetime.now(UTC)
        session.commit()
