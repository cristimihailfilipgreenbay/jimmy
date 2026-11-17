"""Tool switches, defaults and the cost of an answer."""

import uuid
from types import SimpleNamespace

import pytest

from app.chat.agent import build_agent
from app.chat.cost import calculate_cost
from app.chat.prompt import build_prompt
from app.chat.tools import RunSources
from app.settings.service import (
    DEFAULT_MAX_TOKENS,
    DEFAULT_TEMPERATURE,
    TOOLS,
    TutorSettings,
    resolve,
)
from tests.test_tutor_agent import ScriptedModel


def offered(tutor, **kwargs):
    agent = build_agent(
        uuid.uuid4(),
        RunSources(),
        ScriptedModel(replies=[]),
        library=True,
        web=True,
        learned=True,
        flashcards=True,
        tutor=tutor,
        **kwargs,
    )
    return set(agent.nodes["tools"].bound.tools_by_name)


@pytest.fixture(autouse=True)
def tavily(monkeypatch):
    monkeypatch.setattr(
        "app.chat.agent.get_settings",
        lambda: SimpleNamespace(tavily_api_key="key"),
    )


def test_cost_is_tokens_times_list_price():
    assert calculate_cost(1000, 500, 0.000003, 0.000015) == pytest.approx(0.0105)


def test_cost_is_unknown_without_a_price():
    assert calculate_cost(1000, 500, None, 0.000015) is None
    assert calculate_cost(1000, 500, 0.000003, None) is None


def test_no_tokens_cost_nothing():
    assert calculate_cost(0, 0, 0.000003, 0.000015) == 0


def test_every_tool_is_offered_by_default():
    assert {"search_notes", *TOOLS} <= offered(None)


def test_a_disabled_tool_is_not_offered():
    names = offered(TutorSettings(disabled=frozenset({"search_web"})))
    assert "search_web" not in names
    assert "search_wikipedia" in names


def test_disabling_every_switch_leaves_only_the_notes():
    names = offered(TutorSettings(disabled=frozenset(TOOLS)))
    assert names == {"search_notes"}


def test_notes_cannot_be_switched_off():
    assert "search_notes" not in TOOLS


def test_a_disabled_tool_is_left_out_of_the_prompt():
    prompt = build_prompt(wikipedia=True, web=False)
    assert "search_web" not in prompt
    assert "search_wikipedia" in prompt


def row(**values):
    base = {
        "tutor_model": None,
        "background_model": None,
        "temperature": None,
        "max_tokens": None,
        "tools": {},
        "show_usage": True,
    }
    return SimpleNamespace(**{**base, **values})


def test_empty_settings_use_the_defaults():
    tutor = resolve(row())
    assert tutor.temperature == DEFAULT_TEMPERATURE
    assert tutor.max_tokens == DEFAULT_MAX_TOKENS
    assert tutor.disabled == frozenset()


def test_a_temperature_of_zero_is_kept():
    assert resolve(row(temperature=0)).temperature == 0


def test_only_switched_off_tools_are_disabled():
    tutor = resolve(row(tools={"search_web": False, "search_library": True}))
    assert tutor.disabled == frozenset({"search_web"})
