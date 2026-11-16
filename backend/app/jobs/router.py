"""`GET /spaces/{space_id}/events`: background work reported to the open page."""

import asyncio
import json
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import engine
from app.jobs.models import Job
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space

router = APIRouter(tags=["jobs"])

SpaceDep = Annotated[Space, Depends(get_owned_space)]

POLL_SECONDS = 1.0
HEARTBEAT_SECONDS = 15.0


def finished_since(space_id, since: datetime) -> list[Job]:
    with Session(engine) as session:
        return list(
            session.scalars(
                select(Job)
                .where(
                    Job.space_id == space_id,
                    Job.finished_at.is_not(None),
                    Job.finished_at > since,
                )
                .order_by(Job.finished_at)
            )
        )


def job_event(job: Job) -> str:
    data = {
        "job_id": str(job.id),
        "kind": job.kind,
        "status": job.status,
        "message": job.message or "",
        "outcome": (job.payload or {}).get("outcome"),
    }
    return f"event: job\ndata: {json.dumps(data)}\n\n"


async def _stream(space_id):
    # Only work that finishes while the page is open: nothing is replayed.
    since = datetime.now(UTC)
    quiet = 0.0
    while True:
        jobs = await asyncio.to_thread(finished_since, space_id, since)
        for job in jobs:
            since = max(since, job.finished_at)
            quiet = 0.0
            yield job_event(job)
        await asyncio.sleep(POLL_SECONDS)
        quiet += POLL_SECONDS
        if quiet >= HEARTBEAT_SECONDS:
            quiet = 0.0
            yield ": keep-alive\n\n"


@router.get("/spaces/{space_id}/events")
async def space_events(space: SpaceDep):
    return StreamingResponse(
        _stream(space.id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
