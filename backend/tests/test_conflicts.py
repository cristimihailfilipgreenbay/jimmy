"""Conflict resolution: the verdict parser, the pause and the remembered decision."""

import uuid
from contextlib import ExitStack, contextmanager
from unittest.mock import patch

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.tools import StructuredTool
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from app.chat.agent import build_agent
from app.chat.runner import config_for, pending_interrupt
from app.chat.tools import RunSources
from app.conflicts import compare
from app.conflicts.compare import parse_verdict
from app.conflicts.tool import decision_text, make_compare_sources


class ScriptedModel(BaseChatModel):
    replies: list
    calls: int = 0

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def bind_tools(self, tools, **kwargs):
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        reply = self.replies[min(self.calls, len(self.replies) - 1)]
        self.calls += 1
        fresh = reply.model_copy(update={"id": None})
        return ChatResult(generations=[ChatGeneration(message=fresh)])


def _sources() -> RunSources:
    sources = RunSources()
    base = {"author": None, "page_or_section": "p. 1", "url": None}
    sources.add(
        {
            **base,
            "chunk_id": uuid.uuid4(),
            "source_type": "notes",
            "document": "My notes",
            "passage": "Photosynthesis happens in the mitochondria.",
        }
    )
    sources.add(
        {
            **base,
            "chunk_id": uuid.uuid4(),
            "source_type": "library",
            "document": "Biology 2e",
            "passage": "Photosynthesis takes place in chloroplasts.",
        }
    )
    return sources


def test_parse_verdict_accepts_the_three_words_and_nothing_else():
    assert parse_verdict({"verdict": "Contradict"}) == "contradict"
    assert parse_verdict({"verdict": "agree"}) == "agree"
    assert parse_verdict({"verdict": "wrong"}) == "unrelated"
    assert parse_verdict({}) == "unrelated"


def test_a_failing_comparison_never_raises_a_conflict():
    class Broken:
        def invoke(self, *_):
            raise RuntimeError("down")

    assert compare.compare_passages("a-fail", "b-fail", Broken()) == "unrelated"


def test_decision_text_names_the_other_source():
    assert "Subject Library" in decision_text("accept_other", "library")
    assert "Learned Material" in decision_text("keep_notes", "learned")


def test_sources_restore_keeps_the_numbers():
    sources = _sources()
    saved = [c.as_json() for c in sources.citations.values()]
    again = RunSources()
    again.restore(saved)
    assert again.ids == {1, 2}
    assert again.citations[2].source_type == "library"
    # A passage found again after the restore keeps its number.
    assert again.add({**again.citations[1].__dict__}).id == 1


def _stub(name):
    return StructuredTool.from_function(
        lambda query: "nothing", name=name, description="stub"
    )


@contextmanager
def _agent(sources, saver, *, stored=None, verdict="contradict"):
    """An agent with the database patched out; yields it and what was saved."""
    call = AIMessage(
        "",
        tool_calls=[
            {
                "name": "compare_sources",
                "args": {
                    "topic": "Photosynthesis",
                    "notes_passage": 1,
                    "other_passage": 2,
                },
                "id": "1",
            }
        ],
    )
    model = ScriptedModel(replies=[call, AIMessage("[tutor] Done.")])
    tool = make_compare_sources(uuid.uuid4(), sources)
    saved = []
    with ExitStack() as stack:
        for target, kwargs in [
            ("app.conflicts.tool.Session", {}),
            ("app.conflicts.tool.find_decision", {"return_value": stored}),
            (
                "app.conflicts.tool.save_decision",
                {"side_effect": lambda *_, **k: saved.append(k)},
            ),
            ("app.conflicts.tool.compare_passages", {"return_value": verdict}),
            ("app.chat.agent.make_compare_sources", {"return_value": tool}),
            (
                "app.chat.agent.make_search_notes",
                {"return_value": _stub("search_notes")},
            ),
            (
                "app.chat.agent.make_search_library",
                {"return_value": _stub("search_library")},
            ),
        ]:
            stack.enter_context(patch(target, **kwargs))
        agent = build_agent(
            uuid.uuid4(), sources, model, library=True, checkpointer=saver
        )
        yield agent, saved


def _config():
    return config_for(uuid.uuid4(), uuid.uuid4(), uuid.uuid4())


def test_a_contradiction_pauses_and_the_choice_is_stored():
    with _agent(_sources(), InMemorySaver()) as (agent, saved):
        config = _config()
        agent.invoke({"messages": [HumanMessage("Where does it happen?")]}, config)
        _id, value = pending_interrupt(agent, config)
        assert value["kind"] == "conflict"
        assert value["topic"] == "Photosynthesis"
        assert "mitochondria" in value["notes"]["passage"]
        assert "chunk_id" not in value["notes"]
        assert saved == []  # nothing is decided until the Student answers

        agent.invoke(Command(resume="keep_notes"), config)
        assert saved[0]["decision"] == "keep_notes"
        assert saved[0]["other_source_type"] == "library"
        assert pending_interrupt(agent, config) is None


def test_an_unknown_choice_counts_as_unsure():
    with _agent(_sources(), InMemorySaver()) as (agent, saved):
        config = _config()
        agent.invoke({"messages": [HumanMessage("q")]}, config)
        agent.invoke(Command(resume="whatever"), config)
        assert saved[0]["decision"] == "unsure"


def test_a_stored_decision_is_used_without_pausing():
    class Stored:
        decision = "accept_other"

    with _agent(_sources(), InMemorySaver(), stored=Stored()) as (agent, saved):
        config = _config()
        result = agent.invoke({"messages": [HumanMessage("q")]}, config)
        assert pending_interrupt(agent, config) is None
        assert saved == []
        reply = next(m for m in result["messages"] if m.type == "tool").content
        assert "accept the Subject Library" in reply


def test_passages_that_agree_do_not_pause():
    with _agent(_sources(), InMemorySaver(), verdict="agree") as (agent, saved):
        config = _config()
        agent.invoke({"messages": [HumanMessage("q")]}, config)
        assert pending_interrupt(agent, config) is None
        assert saved == []


def test_two_notes_passages_cannot_be_compared():
    sources = _sources()
    tool = make_compare_sources(uuid.uuid4(), sources)
    reply = tool.invoke({"topic": "t", "notes_passage": 1, "other_passage": 1})
    assert "Subject Library or Learned Material" in reply
    assert "not returned" in tool.invoke(
        {"topic": "t", "notes_passage": 1, "other_passage": 9}
    )
