"""`save_flashcards`: the Tutor drafts cards for the Student to review."""

import logging
import uuid

from langchain_core.tools import StructuredTool
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import engine
from app.errors import ApiError
from app.spaces.models import Space
from app.topics.models import Topic

log = logging.getLogger(__name__)

DEFAULT_COUNT = 5
MAX_COUNT = 10


def _match(session: Session, topic_ids: list[uuid.UUID], name: str) -> list[uuid.UUID]:
    """The Topics a name points to: an exact name first, then one that contains it."""
    wanted = name.strip().casefold()
    if not wanted:
        return []
    topics = [
        (t, t.name.casefold())
        for t in session.scalars(select(Topic).where(Topic.id.in_(topic_ids)))
    ]
    exact = [t.id for t, n in topics if n == wanted]
    return exact or [t.id for t, n in topics if wanted in n or n in wanted]


def make_save_flashcards(space_id: uuid.UUID) -> StructuredTool:
    def save_flashcards(topic: str = "", count: int = DEFAULT_COUNT) -> str:
        """Draft Flashcards from the Student's Notes and Subject Library, for the Student
        to approve, edit or reject on the Flashcards screen. `topic` is the name of one
        of the Space's Topics; leave it empty for every Topic. Nothing is added to the
        deck until the Student approves it."""
        # Imported here: the service reaches the study models, which import the agent.
        from app.flashcards.service import space_topic_ids, start_batch

        count = max(1, min(MAX_COUNT, count))
        with Session(engine) as session:
            space = session.get(Space, space_id)
            topic_ids = space_topic_ids(session, space)
            chosen = _match(session, topic_ids, topic)
            if topic.strip() and not chosen:
                return (
                    f"The Study Space has no Topic called “{topic}”. "
                    "Ask the Student which Topic they mean."
                )
            try:
                batch = start_batch(session, space, chosen, count)
            except ApiError as exc:
                return f"No Flashcards were drafted: {exc.message}"
        return (
            f"Drafted {len(batch.cards)} Flashcards. They wait on the Flashcards screen, "
            "in Review drafts, until the Student approves them. Tell the Student that, "
            "and do not write the cards yourself."
        )

    return StructuredTool.from_function(save_flashcards, name="save_flashcards")
