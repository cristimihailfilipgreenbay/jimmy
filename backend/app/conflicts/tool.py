"""`compare_sources`: the Tutor asks whether two passages it found disagree.

On a contradiction the run pauses with LangGraph `interrupt()` until the Student chooses.
The choice is stored, so the same pair never pauses again (docs/domain.md, Conflict).
Everything before `interrupt()` runs again when the run resumes, which is why the
comparison is remembered (see `compare.py`) and a stored decision is read first.
"""

import uuid

from langchain_core.tools import StructuredTool
from langgraph.types import interrupt
from sqlalchemy.orm import Session

from app.conflicts.compare import CONTRADICT, compare_passages
from app.conflicts.service import DECISIONS, find_decision, save_decision
from app.db import engine

OTHER_NAMES = {"library": "Subject Library", "learned": "Learned Material"}

_AFTER = {
    "keep_notes": (
        "The Student decided to keep their Notes. Answer this point from the Notes, "
        "and say it is disputed with the {other}."
    ),
    "accept_other": (
        "The Student decided to accept the {other}. Answer this point from the {other}, "
        "and say their Notes differ so they can check them."
    ),
    "unsure": (
        "The Student is unsure. Show both versions, each with its own citation, and "
        "say the point is unresolved."
    ),
}


def decision_text(decision: str, other_type: str) -> str:
    return _AFTER[decision].format(other=OTHER_NAMES[other_type])


def make_compare_sources(space_id: uuid.UUID, sources, model=None) -> StructuredTool:
    """`compare_sources` bound to one Study Space and to the passages one run found."""

    def compare_sources(topic: str, notes_passage: int, other_passage: int) -> str:
        notes = sources.citations.get(notes_passage)
        other = sources.citations.get(other_passage)
        if notes is None or other is None:
            return "Those passage numbers were not returned by a search in this turn."
        if notes.source_type != "notes" or other.source_type not in OTHER_NAMES:
            return (
                "Give a passage from the Notes and one from the Subject Library or "
                "Learned Material."
            )
        with Session(engine) as session:
            known = find_decision(session, space_id, notes.chunk_id, other.chunk_id)
            if known:
                return decision_text(known.decision, other.source_type)
        if compare_passages(notes.passage, other.passage, model) != CONTRADICT:
            return "The passages do not contradict each other. Answer as usual."

        def shown(c):
            return {k: v for k, v in c.as_json().items() if k != "chunk_id"}

        answer = interrupt(
            {
                "kind": "conflict",
                "topic": topic.strip()[:200],
                "notes": shown(notes),
                "other": shown(other),
            }
        )
        decision = answer if answer in DECISIONS else "unsure"
        with Session(engine) as session:
            save_decision(
                session,
                space_id=space_id,
                topic=topic.strip()[:200],
                notes_chunk_id=notes.chunk_id,
                other_chunk_id=other.chunk_id,
                other_source_type=other.source_type,
                decision=decision,
                notes_document=notes.document,
                other_document=other.document,
                notes_excerpt=notes.passage,
                other_excerpt=other.passage,
            )
        return decision_text(decision, other.source_type)

    compare_sources.__doc__ = (
        "Check whether a Notes passage and a Subject Library or Learned Material passage "
        "you found contradict each other. Give the Topic they are about and the two "
        "passage numbers. If they contradict, the Student is asked to choose and you "
        "are told what they decided."
    )
    return StructuredTool.from_function(compare_sources, name="compare_sources")
