"""The real model and graph the API uses. Tests build the graph with fakes instead."""

from functools import lru_cache

from langchain_openai import ChatOpenAI
from sqlalchemy.orm import Session

from app.chat.agent import OPENROUTER_BASE, ModelNotConfigured
from app.config import get_settings
from app.db import engine
from app.study.graph import build_study_graph
from app.study.sources import find_passage

TIMEOUT = 60


def make_study_model(name: str) -> ChatOpenAI:
    settings = get_settings()
    if not name:
        raise ModelNotConfigured("TUTOR_MODEL is not set.")
    if not settings.openrouter_api_key:
        raise ModelNotConfigured("OPENROUTER_API_KEY is not set.")
    return ChatOpenAI(
        model=name,
        base_url=OPENROUTER_BASE,
        api_key=settings.openrouter_api_key,
        temperature=0.4,
        timeout=TIMEOUT,
        max_retries=1,
    )


@lru_cache
def get_study_graph():
    from app.checkpointer import get_checkpointer

    settings = get_settings()
    # Answer keys decide what a Student learns, so the Tutor's model writes them; the
    # cheaper background model only grades a written answer against the reference.
    return build_study_graph(
        lambda: Session(engine),
        find_passage,
        make_study_model(settings.tutor_model),
        make_study_model(settings.background_model or settings.tutor_model),
        get_checkpointer(),
        dispute_confidence=settings.dispute_confidence_threshold,
        dispute_margin=settings.dispute_margin,
    )
