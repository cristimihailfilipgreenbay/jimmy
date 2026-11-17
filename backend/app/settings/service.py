"""The Student's Tutor settings, with the defaults filled in."""

import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.config import get_settings
from app.settings.models import Settings

DEFAULT_TEMPERATURE = 0.3
DEFAULT_MAX_TOKENS = 2048

# Tools the Student may switch off, in the order the Developer screen lists them:
# name, label, what it does. `search_notes` is not here: every answer starts with it.
TOOLS: dict[str, tuple[str, str]] = {
    "search_library": ("Search Subject Library", "Reviewed textbooks per Study Space"),
    "search_learned_material": (
        "Search Learned Material",
        "Web pages saved from earlier chats, not yet reviewed",
    ),
    "search_wikipedia": (
        "Search Wikipedia",
        "First fallback when the sources have no answer",
    ),
    "search_web": (
        "Web search",
        "Fallback when Notes, Library and Wikipedia have no answer",
    ),
    "compare_sources": (
        "Compare sources",
        "Asks the Student when two sources disagree",
    ),
    "save_flashcards": ("Draft Flashcards", "Creates drafts for the review queue"),
}


# The models the Student can pick: ones that work well for tutoring and that OpenRouter
# offers. Change this list to offer others. `temperature` says whether the model takes
# one; the live answer comes from OpenRouter (`supported_parameters`) and wins.
MODELS: dict[str, tuple[str, str]] = {
    "openai/gpt-6-luna": ("GPT-6 Luna", "Fast and cheap. The default."),
    "anthropic/claude-sonnet-5.5": (
        "Claude Sonnet 5.5",
        "Careful, well-cited answers.",
    ),
    "google/gemini-3.8-flash": (
        "Gemini 3.8 Flash",
        "Fast, and it takes a temperature.",
    ),
}


@dataclass(frozen=True)
class TutorSettings:
    """What one Tutor run uses: the model, sampling and the tools it may call."""

    tutor_model: str = ""
    temperature: float = DEFAULT_TEMPERATURE
    max_tokens: int = DEFAULT_MAX_TOKENS
    disabled: frozenset[str] = frozenset()
    show_usage: bool = True


def resolve(row: Settings | None) -> TutorSettings:
    """The row's values; the environment's models and the defaults where it has none."""
    env = get_settings()
    if row is None:
        return TutorSettings(tutor_model=env.tutor_model)
    return TutorSettings(
        tutor_model=row.tutor_model or env.tutor_model,
        temperature=(
            DEFAULT_TEMPERATURE if row.temperature is None else row.temperature
        ),
        max_tokens=row.max_tokens or DEFAULT_MAX_TOKENS,
        disabled=frozenset(
            name for name, on in (row.tools or {}).items() if on is False
        ),
        show_usage=row.show_usage,
    )


def load_tutor_settings(session: Session, student_id: uuid.UUID) -> TutorSettings:
    return resolve(session.get(Settings, student_id))
