"""The Flashcard drafting graph (docs/architecture.md, section 4).

    draft cards from passages -> wait for the Student's review (interrupt)
      -> cards left? review again / none -> learn a style from the edits -> end

The graph runs on the Postgres checkpointer, one LangGraph thread per batch (a Thread of
kind `flashcard_draft`). The drafts are saved as `flashcards` rows with status `draft`
before the pause, so the Flashcards screen can list them. `POST /threads/{id}/resume`
answers the pause with decisions for any of the pending cards: the run applies them and,
while cards are left, waits again. Once every card is decided, the Student's edits are
turned into a style preference that waits for their Approval.

State holds plain data only. Everything before `interrupt()` runs again on resume, so
`review` does nothing before it but ask.
"""

import logging
import uuid
from collections.abc import Callable
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt
from sqlalchemy.orm import Session

from app.flashcards.cards import BadCard, generate_card, learn_style
from app.flashcards.models import Flashcard
from app.flashcards.style import approved_styles, propose_style
from app.study.sources import PassageFinder
from app.topics.models import Topic

log = logging.getLogger(__name__)

SessionFactory = Callable[[], Session]
APPROVE, REJECT, EDIT = "approve", "reject", "edit"


class FlashState(TypedDict, total=False):
    space_id: str
    student_id: str
    thread_id: str
    topic_ids: list[str]
    count: int
    # Drafts the Student has not decided yet.
    pending: list[str]
    # Cards the Student changed: what they were and what they became.
    edits: list[dict]


def apply_decisions(session: Session, pending: list[str], decisions: list[dict]):
    """Apply the Student's decisions to the pending drafts, which stay checked against
    `pending` so a decision cannot touch another card.

    Returns (decided ids, edits). An edit that changes nothing is a plain approval."""
    decided: list[str] = []
    edits: list[dict] = []
    for d in decisions:
        if d["id"] not in pending or d["id"] in decided:
            continue
        card = session.get(Flashcard, uuid.UUID(d["id"]))
        if card is None or card.status != "draft":
            continue
        if d["action"] == REJECT:
            card.status = "rejected"
        else:
            card.status = "approved"
            if d["action"] == EDIT and (d["front"], d["back"]) != (
                card.front,
                card.back,
            ):
                edits.append(
                    {
                        "before_front": card.front,
                        "before_back": card.back,
                        "front": d["front"],
                        "back": d["back"],
                    }
                )
                card.front, card.back, card.was_edited = d["front"], d["back"], True
        decided.append(d["id"])
    return decided, edits


def build_flashcard_graph(
    factory: SessionFactory,
    find_passage: PassageFinder,
    card_model: Callable[[], object],
    style_model: Callable[[], object],
    checkpointer,
):
    """The models are made when first needed, so a pending draft can be read without
    them."""

    def draft(state: FlashState) -> FlashState:
        space_id = uuid.UUID(state["space_id"])
        topic_ids = [uuid.UUID(t) for t in state["topic_ids"]]
        with factory() as session:
            styles = approved_styles(session, uuid.UUID(state["student_id"]))
            model = card_model()
            used: set[uuid.UUID] = set()
            made: list[Flashcard] = []
            for i in range(state["count"]):
                topic = session.get(Topic, topic_ids[i % len(topic_ids)])
                try:
                    source = find_passage(session, space_id, topic.name, used)
                    card = generate_card(
                        model,
                        passage=source["passage"],
                        topic=topic.name,
                        styles=styles,
                    )
                except BadCard:
                    continue
                used.add(uuid.UUID(source["chunk_id"]))
                made.append(
                    Flashcard(
                        space_id=space_id,
                        topic_id=topic.id,
                        thread_id=uuid.UUID(state["thread_id"]),
                        front=card.front,
                        back=card.back,
                        source_chunk_id=uuid.UUID(source["chunk_id"]),
                        source={k: v for k, v in source.items() if k != "chunk_id"},
                    )
                )
            if not made:
                raise BadCard("Jimmy could not write any card from your sources.")
            session.add_all(made)
            session.commit()
            return {"pending": [str(c.id) for c in made], "edits": []}

    def review(state: FlashState) -> FlashState:
        decisions = interrupt(
            {"kind": "flashcard_review", "card_ids": state["pending"]}
        )
        with factory() as session:
            decided, edits = apply_decisions(session, state["pending"], decisions)
            session.commit()
        return {
            "pending": [c for c in state["pending"] if c not in decided],
            "edits": [*state["edits"], *edits],
        }

    def left(state: FlashState) -> str:
        return "review" if state["pending"] else "learn"

    def learn(state: FlashState) -> FlashState:
        if state["edits"]:
            try:
                text = learn_style(style_model(), state["edits"])
            except Exception:
                log.warning("Could not make the style model", exc_info=True)
                return {}
            with factory() as session:
                propose_style(session, uuid.UUID(state["student_id"]), text)
                session.commit()
        return {}

    graph = StateGraph(FlashState)
    graph.add_node("draft", draft)
    graph.add_node("review", review)
    graph.add_node("learn", learn)
    graph.add_edge(START, "draft")
    graph.add_edge("draft", "review")
    graph.add_conditional_edges("review", left, ["review", "learn"])
    graph.add_edge("learn", END)
    return graph.compile(checkpointer=checkpointer)
