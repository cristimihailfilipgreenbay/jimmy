"""Runs one Tutor turn and turns it into typed events for the SSE stream."""

import logging
import re
import uuid
from collections.abc import Iterator
from dataclasses import dataclass, field

from langchain.agents.middleware.model_call_limit import ModelCallLimitExceededError
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.types import Command
from sqlalchemy.orm import Session

from app.chat.agent import ModelNotConfigured, build_agent
from app.chat.citations import check_answer, cited_ids, enforce, strip_markers
from app.chat.guards import StepLimitReached
from app.chat.models import Message
from app.chat.tools import RunSources
from app.db import engine
from app.learned.promotion import promote_in_background

log = logging.getLogger(__name__)

TOOL_LABELS = {
    "search_notes": "Searching your notes…",
    "search_library": "Searching the Subject Library…",
    "search_learned_material": "Searching Learned Material…",
    "search_wikipedia": "Searching Wikipedia…",
    "search_web": "Searching the web…",
    "compare_sources": "Comparing sources…",
}


@dataclass
class Event:
    type: str
    data: dict = field(default_factory=dict)


def history_messages(rows: list[Message]) -> list:
    """Earlier turns as plain text; Citation markers only mean something in their own turn."""
    out: list = []
    for row in rows:
        if row.role == "user":
            out.append(HumanMessage(row.content))
        else:
            out.append(AIMessage(strip_markers(row.content)))
    return out


REDIRECT = "I'm here to help with studying. What would you like to work on?"


def redirect_turn(*, thread_id: uuid.UUID, reply: str) -> Iterator[Event]:
    """An off-topic message gets a friendly reply that steers back to studying."""
    text = reply or REDIRECT
    yield Event("token", {"text": text})
    with Session(engine) as session:
        message = Message(thread_id=thread_id, role="assistant", content=text)
        session.add(message)
        session.commit()
        message_id = message.id
    yield Event("cost", {"tokens_in": 0, "tokens_out": 0, "usd": None})
    yield Event(
        "done", {"message_id": str(message_id), "trace_id": None, "content": text}
    )


def config_for(thread_id, turn_id, space_id) -> dict:
    # Each turn is its own LangGraph thread: the history is passed in, and a paused turn
    # waits in the checkpointer under this id until the Student answers.
    return {
        "configurable": {"thread_id": f"{thread_id}:{turn_id}"},
        "run_name": "tutor-chat",
        "metadata": {"thread_id": str(thread_id), "space_id": str(space_id)},
    }


def pending_interrupt(agent, config) -> tuple[str, dict] | None:
    """The pause this turn is waiting on: its id and what it shows the Student."""
    try:
        state = agent.get_state(config)
    except ValueError:  # the agent has no checkpointer
        return None
    for task in state.tasks:
        for found in task.interrupts:
            return found.id, found.value
    return None


def run_turn(
    *,
    thread_id: uuid.UUID,
    space_id: uuid.UUID,
    history: list,
    question: str,
    model=None,
    library: bool = False,
    web: bool = False,
    space_name: str = "",
    learned: bool = False,
    checkpointer=None,
    turn_id: uuid.UUID | None = None,
    compare_model=None,
) -> Iterator[Event]:
    """Stream the answer, then store it. Never raises: failures become `error` events."""
    sources = RunSources()
    try:
        agent = build_agent(
            space_id, sources, model, library, web, learned, checkpointer, compare_model
        )
    except ModelNotConfigured as exc:
        yield Event("error", {"code": "upstream_unavailable", "message": str(exc)})
        return
    yield from _drive(
        agent,
        sources,
        {"messages": [*history, HumanMessage(question)]},
        config_for(thread_id, turn_id or uuid.uuid4(), space_id),
        thread_id=thread_id,
        space_id=space_id,
        space_name=space_name,
        checkpointer=checkpointer,
    )


def resume_turn(
    *,
    thread_id: uuid.UUID,
    turn_id: uuid.UUID,
    space_id: uuid.UUID,
    decision: str,
    model=None,
    library: bool = False,
    web: bool = False,
    space_name: str = "",
    learned: bool = False,
    checkpointer=None,
    compare_model=None,
) -> Iterator[Event]:
    """Continue a paused turn with the Student's decision."""
    sources = RunSources()
    try:
        agent = build_agent(
            space_id, sources, model, library, web, learned, checkpointer, compare_model
        )
    except ModelNotConfigured as exc:
        yield Event("error", {"code": "upstream_unavailable", "message": str(exc)})
        return
    config = config_for(thread_id, turn_id, space_id)
    # The Citations found before the pause travel with the paused turn.
    for message in agent.get_state(config).values.get("messages", []):
        if isinstance(message, ToolMessage) and isinstance(message.artifact, list):
            sources.restore(message.artifact)
    yield from _drive(
        agent,
        sources,
        Command(resume=decision),
        config,
        thread_id=thread_id,
        space_id=space_id,
        space_name=space_name,
        checkpointer=checkpointer,
    )


def _drive(
    agent,
    sources: RunSources,
    agent_input,
    config: dict,
    *,
    thread_id: uuid.UUID,
    space_id: uuid.UUID,
    space_name: str,
    checkpointer,
) -> Iterator[Event]:
    paused = False
    try:
        for event in _stream(
            agent, sources, agent_input, config, thread_id, space_id, space_name
        ):
            paused = paused or event.type == "interrupt"
            yield event
    finally:
        # A finished turn leaves nothing to resume.
        if checkpointer is not None and not paused:
            try:
                checkpointer.delete_thread(config["configurable"]["thread_id"])
            except Exception:
                log.warning(
                    "Could not clear a finished turn's checkpoints", exc_info=True
                )


def _stream(
    agent,
    sources: RunSources,
    agent_input,
    config: dict,
    thread_id: uuid.UUID,
    space_id: uuid.UUID,
    space_name: str,
) -> Iterator[Event]:
    text, has_tools, current_id = "", False, None
    tokens_in = tokens_out = 0
    try:
        stream = agent.stream(agent_input, config=config, stream_mode="messages")
        for chunk, _meta in stream:
            if isinstance(chunk, ToolMessage):
                found = len(
                    re.findall(r"^\[\d+\] \(", str(chunk.content), re.MULTILINE)
                )
                done = {"tool": chunk.name, "status": "finished"}
                if chunk.name != "compare_sources":
                    done["found"] = found
                yield Event("tool_call", done)
                continue
            if not isinstance(chunk, AIMessage):
                continue
            if chunk.id != current_id:
                if text and not has_tools:
                    # The Citation check rejected that answer; the next one replaces it.
                    yield Event("reset")
                current_id, text, has_tools = chunk.id, "", False
            if chunk.usage_metadata:
                tokens_in += chunk.usage_metadata.get("input_tokens", 0)
                tokens_out += chunk.usage_metadata.get("output_tokens", 0)
            # A streamed chunk carries `tool_call_chunks`; a whole message `tool_calls`.
            for call in getattr(chunk, "tool_call_chunks", None) or chunk.tool_calls:
                if call.get("name"):
                    has_tools = True
                    yield Event(
                        "tool_call",
                        {
                            "tool": call["name"],
                            "status": "started",
                            "description": TOOL_LABELS.get(call["name"], call["name"]),
                        },
                    )
            if chunk.text:
                text += chunk.text
                yield Event("token", {"text": chunk.text})
    except (StepLimitReached, ModelCallLimitExceededError):
        yield Event(
            "error",
            {
                "code": "step_limit_reached",
                "message": "Jimmy stopped: it used too many steps on this question.",
            },
        )
        return
    except Exception:
        log.exception("Tutor run failed")
        yield Event(
            "error",
            {
                "code": "upstream_unavailable",
                "message": "Jimmy could not reach the model. Try again in a moment.",
            },
        )
        return

    paused = pending_interrupt(agent, config)
    if paused:
        interrupt_id, value = paused
        yield Event(
            "interrupt",
            {
                "interrupt_id": interrupt_id,
                "kind": value["kind"],
                "payload": {k: v for k, v in value.items() if k != "kind"},
            },
        )
        return

    if has_tools or not text.strip():
        yield Event(
            "error",
            {"code": "upstream_unavailable", "message": "Jimmy did not answer."},
        )
        return

    valid = sources.ids
    if check_answer(text, valid):
        text = enforce(text, valid)
    citations = [sources.citations[n] for n in cited_ids(text, valid)]
    with Session(engine) as session:
        message = Message(
            thread_id=thread_id,
            role="assistant",
            content=text,
            citations=[c.as_json() for c in citations],
            tokens_in=tokens_in or None,
            tokens_out=tokens_out or None,
        )
        session.add(message)
        session.commit()
        message_id = message.id
    # Saving a web Finding runs in the background; the answer never waits for it.
    promote_in_background(space_id, space_name, citations)
    for c in citations:
        yield Event(
            "citation", {k: v for k, v in c.as_json().items() if k != "chunk_id"}
        )
    yield Event("cost", {"tokens_in": tokens_in, "tokens_out": tokens_out, "usd": None})
    yield Event(
        "done", {"message_id": str(message_id), "trace_id": None, "content": text}
    )
