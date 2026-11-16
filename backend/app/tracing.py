"""A trivial LangGraph call, used to prove that LangSmith tracing works."""

import logging
from typing import TypedDict

from langchain_core.tracers.langchain import wait_for_all_tracers
from langgraph.graph import END, START, StateGraph

from app.config import get_settings

log = logging.getLogger(__name__)


class State(TypedDict):
    message: str


def _hello(state: State) -> State:
    return {"message": f"{state['message']}, traced"}


def build_graph():
    graph = StateGraph(State)
    graph.add_node("hello", _hello)
    graph.add_edge(START, "hello")
    graph.add_edge("hello", END)
    return graph.compile()


def run_trace_check() -> None:
    """Run the trivial graph once. Never raises: tracing must not stop the app."""
    settings = get_settings()
    if not (settings.langsmith_tracing and settings.langsmith_api_key):
        log.info("LangSmith tracing is off; skipping the startup trace")
        return
    try:
        result = build_graph().invoke(
            {"message": "hello from Jimmy"},
            config={"run_name": "walking-skeleton", "tags": ["startup-check"]},
        )
        wait_for_all_tracers()
        log.info("Startup trace sent to LangSmith: %s", result["message"])
    except Exception:
        log.exception("Startup trace failed")
