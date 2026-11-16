"""The Tutor chat agent: `create_agent` (ReAct) with its middleware."""

from langchain.agents import create_agent
from langchain.agents.middleware import (
    AgentMiddleware,
    ModelCallLimitMiddleware,
    after_model,
    before_model,
)
from langchain_core.messages import AIMessage, HumanMessage
from langchain_openai import ChatOpenAI

from app.chat.citations import check_answer
from app.chat.guards import (
    MAX_MODEL_CALLS,
    StepLimitReached,
    call_key,
    is_doom_loop,
)
from app.chat.prompt import build_prompt
from app.chat.tools import (
    RunSources,
    make_search_learned,
    make_search_library,
    make_search_notes,
    make_search_web,
    make_search_wikipedia,
)
from app.config import get_settings
from app.conflicts.tool import make_compare_sources

OPENROUTER_BASE = "https://openrouter.ai/api/v1"
CITATION_RETRIES = 1
_FIX_MARKER = "[citation check]"


class ModelNotConfigured(Exception):
    pass


def make_model() -> ChatOpenAI:
    settings = get_settings()
    if not settings.tutor_model:
        raise ModelNotConfigured("TUTOR_MODEL is not set.")
    if not settings.openrouter_api_key:
        raise ModelNotConfigured("OPENROUTER_API_KEY is not set.")
    return ChatOpenAI(
        model=settings.tutor_model,
        base_url=OPENROUTER_BASE,
        api_key=settings.openrouter_api_key,
        streaming=True,
        stream_usage=True,
    )


def doom_loop_stop() -> AgentMiddleware:
    @before_model
    def stop_on_repeated_calls(state, runtime):
        calls = [
            call_key(c["name"], c["args"])
            for m in state["messages"]
            if isinstance(m, AIMessage)
            for c in m.tool_calls
        ]
        if is_doom_loop(calls):
            raise StepLimitReached("The same tool call was made three times.")

    return stop_on_repeated_calls


def citation_check(sources: RunSources) -> AgentMiddleware:
    """Reject an answer whose paragraphs are neither cited nor labelled, once."""

    @after_model(can_jump_to=["model"])
    def check(state, runtime):
        last = state["messages"][-1]
        if not isinstance(last, AIMessage) or last.tool_calls:
            return None
        text = last.text if hasattr(last, "text") else str(last.content)
        problems = check_answer(text, sources.ids)
        retries = sum(
            1
            for m in state["messages"]
            if isinstance(m, HumanMessage) and str(m.content).startswith(_FIX_MARKER)
        )
        if not problems or retries >= CITATION_RETRIES:
            return None
        note = (
            f"{_FIX_MARKER} Rewrite your answer. "
            + " ".join(problems)
            + " Cite each paragraph with [n] from a search tool, or start it with [tutor]."
        )
        return {"messages": [HumanMessage(note)], "jump_to": "model"}

    return check


def build_agent(
    space_id,
    sources: RunSources,
    model=None,
    library: bool = False,
    web: bool = False,
    learned: bool = False,
    checkpointer=None,
    compare_model=None,
):
    """`library`: the Space has a Subject Library attached and switched on.
    `learned`: the Space has Learned Material.
    `web`: the Student allows web search (Wikipedia, and Tavily when it has a key).
    `checkpointer`: where a run waits when it pauses for the Student (a Conflict)."""
    tools = [make_search_notes(space_id, sources)]
    if library:
        tools.append(make_search_library(space_id, sources))
    if learned:
        tools.append(make_search_learned(space_id, sources))
    # A Conflict needs Notes and a second Source from the Space to compare.
    compare = library or learned
    if compare:
        tools.append(make_compare_sources(space_id, sources, compare_model))
    use_tavily = web and bool(get_settings().tavily_api_key)
    if web:
        tools.append(make_search_wikipedia(sources))
    if use_tavily:
        tools.append(make_search_web(sources))
    return create_agent(
        model or make_model(),
        tools=tools,
        system_prompt=build_prompt(library, web, use_tavily, learned, compare),
        middleware=[
            ModelCallLimitMiddleware(run_limit=MAX_MODEL_CALLS, exit_behavior="error"),
            doom_loop_stop(),
            citation_check(sources),
        ],
        checkpointer=checkpointer,
    )
