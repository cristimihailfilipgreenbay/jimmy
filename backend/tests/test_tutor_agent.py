"""The Tutor with a scripted fake model: retries once on a bad answer, stops on loops."""

import uuid
from unittest.mock import patch

import pytest
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from app.chat.guards import StepLimitReached
from app.chat.runner import run_turn
from app.chat.tools import RunSources


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
        # A real model gives every call a new message id.
        fresh = reply.model_copy(update={"id": None})
        return ChatResult(generations=[ChatGeneration(message=fresh)])


def _run(model):
    return list(
        run_turn(
            thread_id=uuid.uuid4(),
            space_id=uuid.uuid4(),
            history=[],
            question="What is ATP?",
            model=model,
        )
    )


@pytest.fixture(autouse=True)
def no_database():
    with patch("app.chat.runner.Session") as session:
        session.return_value.__enter__.return_value.add = lambda m: setattr(
            m, "id", uuid.uuid4()
        )
        yield


def test_labelled_answer_streams_and_finishes():
    model = ScriptedModel(replies=[AIMessage("[tutor] ATP is a molecule.")])
    events = _run(model)
    types = [e.type for e in events]
    assert "token" in types
    assert types[-1] == "done"
    assert events[-1].data["content"] == "[tutor] ATP is a molecule."


def test_unattributed_answer_is_rewritten_once_then_enforced():
    model = ScriptedModel(replies=[AIMessage("ATP is a molecule.")])
    events = _run(model)
    assert model.calls == 2  # one retry, then the backend labels it itself
    assert "reset" in [e.type for e in events]
    assert events[-1].data["content"] == "[tutor] ATP is a molecule."


def test_repeated_identical_tool_calls_stop_the_run():
    call = AIMessage(
        "", tool_calls=[{"name": "search_notes", "args": {"query": "atp"}, "id": "1"}]
    )
    model = ScriptedModel(replies=[call])
    with patch("app.chat.agent.make_search_notes") as tool:
        from langchain_core.tools import StructuredTool

        tool.return_value = StructuredTool.from_function(
            lambda query: "No passages found in the Notes.",
            name="search_notes",
            description="search",
        )
        events = _run(model)
    assert events[-1].type == "error"
    assert events[-1].data["code"] == "step_limit_reached"


def test_run_sources_numbers_each_chunk_once():
    sources = RunSources()
    chunk = uuid.uuid4()
    args = {
        "chunk_id": chunk,
        "source_type": "notes",
        "document": "D",
        "author": None,
        "page_or_section": "p. 1",
        "passage": "x",
    }
    assert sources.add(args).id == 1
    assert sources.add(args).id == 1
    assert sources.add({**args, "chunk_id": uuid.uuid4()}).id == 2
    assert sources.ids == {1, 2}


def test_step_limit_is_an_exception_type():
    assert issubclass(StepLimitReached, Exception)
