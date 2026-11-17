"""Ask the golden questions to the real Tutor (the same agent the chat uses)."""

import logging
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from langchain_core.messages import AIMessage, HumanMessage

from app.chat.agent import build_agent
from app.chat.citations import check_answer, cited_ids, enforce
from app.chat.tools import RunSources
from app.config import get_settings
from app.settings.service import TutorSettings

log = logging.getLogger(__name__)

GOLDEN = Path(__file__).parent / "golden.json"
# A Conflict pauses the run for the Student, which nobody is here to answer; the
# Conflict check has its own section.
TOOLS_OFF = frozenset({"compare_sources"})


@dataclass
class Answer:
    id: str
    space: str
    category: str
    question: str
    reference: str
    text: str = ""
    # The Tutor's answer before the last-resort labelling, to see if the Citation check
    # alone was enough.
    raw_text: str = ""
    # Every passage the searches returned, not only the ones the answer cites.
    contexts: list[str] = field(default_factory=list)
    cited: list[dict] = field(default_factory=list)
    problems: list[str] = field(default_factory=list)
    error: str = ""


def ask(item: dict, space_id: uuid.UUID) -> Answer:
    answer = Answer(
        item["id"], item["space"], item["category"], item["question"], item["reference"]
    )
    sources = RunSources()
    tutor = TutorSettings(tutor_model=get_settings().tutor_model, disabled=TOOLS_OFF)
    try:
        agent = build_agent(
            space_id,
            sources,
            library=True,
            # Only the web question may leave the Study Space.
            web=item["category"] == "web",
            tutor=tutor,
        )
        result = agent.invoke({"messages": [HumanMessage(item["question"])]})
    except Exception as exc:
        log.exception("%s failed", item["id"])
        answer.error = f"{type(exc).__name__}: {exc}"[:300]
        return answer
    last = next(
        (m for m in reversed(result["messages"]) if isinstance(m, AIMessage)), None
    )
    text = (last.text if last is not None else "").strip()
    valid = sources.ids
    answer.raw_text = text
    answer.problems = check_answer(text, valid)
    answer.text = enforce(text, valid) if answer.problems else text
    answer.contexts = [c.passage for c in sources.citations.values()]
    answer.cited = [
        sources.citations[n].as_json() for n in cited_ids(answer.text, valid)
    ]
    return answer
