"""Drafting, reviewing and learning a style from edits, with a fake model."""

import json
import uuid

import pytest
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.chat import models as _chat  # noqa: F401  (tables the FKs point to)
from app.chunks import models as _chunks  # noqa: F401
from app.db import Base
from app.flashcards.cards import BadCard, generate_card, parse_card, parse_style
from app.flashcards.graph import build_flashcard_graph
from app.flashcards.models import Flashcard
from app.flashcards.style import approved_styles, propose_style
from app.profile.models import ProfileFact
from app.spaces import models as _spaces  # noqa: F401
from app.students import models as _students  # noqa: F401
from app.topics.models import Topic

SPACE, STUDENT = uuid.uuid4(), uuid.uuid4()


class FakeModel:
    """Writes cards numbered by call, and answers the style prompt with `style`."""

    def __init__(self, style=""):
        self.style = style
        self.systems: list[str] = []
        self.calls = 0

    def invoke(self, messages):
        system = messages[0].content
        self.systems.append(system)
        if "look at how a Student corrected" in system:
            data = {"style": self.style}
        else:
            self.calls += 1
            data = {"front": f"Question {self.calls}?", "back": f"Answer {self.calls}."}
        text = json.dumps(data)
        return type("R", (), {"content": text, "text": text})()


def passage_finder(session, space_id, topic, avoid):
    return {
        "chunk_id": str(uuid.uuid4()),
        "source_type": "notes",
        "document": "Notes",
        "author": None,
        "page_or_section": "p. 1",
        "passage": "A passage.",
        "url": None,
    }


# --- pure parts ---------------------------------------------------------------------


def test_a_card_needs_a_front_and_a_different_back():
    assert parse_card({"front": " What? ", "back": "That."}).front == "What?"
    with pytest.raises(BadCard):
        parse_card({"front": "What?", "back": ""})
    with pytest.raises(BadCard):
        parse_card({"front": "Same", "back": "same"})


def test_the_approved_styles_reach_the_writers_prompt():
    model = FakeModel()
    generate_card(model, passage="p", topic="T", styles=["Keep fronts short."])
    assert "Keep fronts short." in model.systems[0]
    generate_card(model, passage="p", topic="T", styles=[])
    assert "preferences" not in model.systems[1]


def test_a_style_is_one_trimmed_sentence_or_nothing():
    assert parse_style({"style": "  Short fronts. "}) == "Short fronts."
    assert parse_style({}) == ""


# --- the graph ----------------------------------------------------------------------


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(
        engine, tables=[Topic.__table__, Flashcard.__table__, ProfileFact.__table__]
    )
    return engine


def _start(engine, model=None, count=3, config_id=None):
    with Session(engine) as s:
        topic = Topic(space_id=SPACE, name="Osmosis")
        s.add(topic)
        s.commit()
        topic_id = topic.id
    model = model or FakeModel("Keep the front a short question.")
    graph = build_flashcard_graph(
        lambda: Session(engine),
        passage_finder,
        lambda: model,
        lambda: model,
        InMemorySaver(),
    )
    thread = uuid.uuid4()
    config = {"configurable": {"thread_id": str(thread)}}
    graph.invoke(
        {
            "space_id": str(SPACE),
            "student_id": str(STUDENT),
            "thread_id": str(thread),
            "topic_ids": [str(topic_id)],
            "count": count,
            "pending": [],
            "edits": [],
        },
        config,
    )
    return graph, config, model


def _pending(graph, config):
    state = graph.get_state(config)
    return [p.value for t in state.tasks for p in t.interrupts]


def _cards(engine):
    with Session(engine) as s:
        return list(s.scalars(select(Flashcard).order_by(Flashcard.front)))


def _decide(graph, config, decisions):
    graph.invoke(Command(resume=decisions), config)


def test_drafts_are_saved_and_the_run_waits_for_the_student(db):
    graph, config, _ = _start(db)
    pause = _pending(graph, config)[0]
    assert pause["kind"] == "flashcard_review" and len(pause["card_ids"]) == 3
    assert {c.status for c in _cards(db)} == {"draft"}


def test_approve_and_reject_decide_each_card(db):
    graph, config, _ = _start(db)
    a, b, c = _pending(graph, config)[0]["card_ids"]
    _decide(
        graph,
        config,
        [
            {"id": a, "action": "approve"},
            {"id": b, "action": "reject"},
            {"id": c, "action": "approve"},
        ],
    )
    status = {str(card.id): card.status for card in _cards(db)}
    assert status == {a: "approved", b: "rejected", c: "approved"}
    assert not _pending(graph, config)


def test_a_review_of_some_cards_waits_for_the_rest(db):
    graph, config, _ = _start(db)
    a, b, c = _pending(graph, config)[0]["card_ids"]
    _decide(graph, config, [{"id": a, "action": "approve"}])
    assert _pending(graph, config)[0]["card_ids"] == [b, c]
    _decide(
        graph, config, [{"id": b, "action": "reject"}, {"id": c, "action": "reject"}]
    )
    assert not _pending(graph, config)


def test_a_decision_cannot_touch_a_card_that_is_not_waiting(db):
    graph, config, _ = _start(db)
    other = uuid.uuid4()
    with Session(db) as s:
        s.add(
            Flashcard(
                id=other,
                space_id=SPACE,
                topic_id=uuid.uuid4(),
                front="x",
                back="y",
                status="draft",
                source={},
            )
        )
        s.commit()
    ids = _pending(graph, config)[0]["card_ids"]
    _decide(graph, config, [{"id": str(other), "action": "approve"}])
    with Session(db) as s:
        assert s.get(Flashcard, other).status == "draft"
    assert _pending(graph, config)[0]["card_ids"] == ids


def test_an_edit_saves_the_new_text_and_approves(db):
    graph, config, _ = _start(db, count=1)
    [a] = _pending(graph, config)[0]["card_ids"]
    _decide(
        graph, config, [{"id": a, "action": "edit", "front": "Short?", "back": "Yes."}]
    )
    [card] = _cards(db)
    assert (card.front, card.back, card.status, card.was_edited) == (
        "Short?",
        "Yes.",
        "approved",
        True,
    )


def test_an_edit_that_changes_nothing_is_a_plain_approval(db):
    graph, config, _ = _start(db, count=1)
    [a] = _pending(graph, config)[0]["card_ids"]
    [card] = _cards(db)
    _decide(
        graph,
        config,
        [{"id": a, "action": "edit", "front": card.front, "back": card.back}],
    )
    assert not _cards(db)[0].was_edited
    with Session(db) as s:
        assert s.scalar(select(ProfileFact)) is None


def test_edits_become_a_style_waiting_for_approval(db):
    graph, config, _ = _start(db, count=2)
    a, b = _pending(graph, config)[0]["card_ids"]
    _decide(
        graph, config, [{"id": a, "action": "edit", "front": "Short?", "back": "Yes."}]
    )
    with Session(db) as s:  # nothing is learned while cards are still waiting
        assert s.scalar(select(ProfileFact)) is None
    _decide(graph, config, [{"id": b, "action": "approve"}])
    with Session(db) as s:
        fact = s.scalar(select(ProfileFact))
        assert fact.status == "proposed" and fact.origin == "flashcard_edits"
        assert fact.kind == "style" and fact.text == "Keep the front a short question."
        assert approved_styles(s, STUDENT) == []  # not yet approved


def test_no_clear_style_proposes_nothing(db):
    graph, config, _ = _start(db, model=FakeModel(""), count=1)
    [a] = _pending(graph, config)[0]["card_ids"]
    _decide(
        graph, config, [{"id": a, "action": "edit", "front": "Short?", "back": "Yes."}]
    )
    with Session(db) as s:
        assert s.scalar(select(ProfileFact)) is None


def test_an_approved_style_changes_the_next_batch(db):
    with Session(db) as s:
        s.add(
            ProfileFact(
                student_id=STUDENT,
                kind="style",
                text="Keep the front a short question.",
                origin="flashcard_edits",
                status="approved",
            )
        )
        s.add(
            ProfileFact(
                student_id=STUDENT,
                kind="style",
                text="Never mention proposals.",
                origin="flashcard_edits",
                status="proposed",
            )
        )
        s.commit()
    _graph, _config, model = _start(db, count=1)
    assert "Keep the front a short question." in model.systems[0]
    assert "Never mention proposals." not in model.systems[0]


# --- the style record ---------------------------------------------------------------


def test_a_style_is_not_proposed_twice_and_one_proposal_waits(db):
    with Session(db) as s:
        propose_style(s, STUDENT, "Short fronts.")
        s.commit()
        assert propose_style(s, STUDENT, "short fronts.") is None  # already waiting
        propose_style(s, STUDENT, "Use examples.")  # replaces the waiting one
        s.commit()
        facts = list(s.scalars(select(ProfileFact)))
        assert [f.text for f in facts] == ["Use examples."]
        assert propose_style(s, STUDENT, "") is None
