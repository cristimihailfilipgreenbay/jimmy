"""The real models and graph the API uses. Tests build the graph with fakes instead."""

from functools import lru_cache

from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import engine
from app.flashcards.graph import build_flashcard_graph
from app.study.runtime import make_study_model
from app.study.sources import find_passage


@lru_cache
def get_flashcard_graph():
    from app.checkpointer import get_checkpointer

    settings = get_settings()
    # Cards decide what a Student revises, so the Tutor's model writes them; the cheaper
    # background model only reads the Student's edits for a style.
    return build_flashcard_graph(
        lambda: Session(engine),
        find_passage,
        lambda: make_study_model(settings.tutor_model),
        lambda: make_study_model(settings.background_model or settings.tutor_model),
        get_checkpointer(),
    )
