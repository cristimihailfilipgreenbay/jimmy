import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SessionIn(BaseModel):
    kind: Literal["quiz"] = "quiz"
    # Empty means every Topic in the Study Space.
    topic_ids: list[uuid.UUID] = []
    question_count: int = Field(default=5, ge=1, le=20)


class QuestionOut(BaseModel):
    """A question as the Student sees it: never the answer key."""

    id: uuid.UUID
    topic_id: uuid.UUID
    topic: str
    position: int
    type: Literal["multiple_choice", "short_answer", "essay"]
    prompt: str
    options: list[str] | None
    difficulty: str


class SourceOut(BaseModel):
    source_type: str
    document: str
    author: str | None
    page_or_section: str | None
    passage: str
    url: str | None = None


class FeedbackOut(BaseModel):
    """What the Student learns after answering: the key, the reason and the passage."""

    question_id: uuid.UUID
    position: int
    topic_id: uuid.UUID
    topic: str
    type: str
    prompt: str
    options: list[str] | None
    answer: str
    correct: bool
    score: float
    correct_answer: str
    explanation: str
    # The grader's note on a written answer.
    note: str | None
    source: SourceOut
    # Whether the Topic is weak now.
    topic_weak: bool


class SessionOut(BaseModel):
    id: uuid.UUID
    space_id: uuid.UUID
    kind: str
    status: str
    question_count: int
    answered: int
    difficulty: str
    current: QuestionOut | None
    started_at: datetime


class AnswerIn(BaseModel):
    question_id: uuid.UUID
    answer: str = Field(min_length=1, max_length=2000)


class AnswerOut(BaseModel):
    feedback: FeedbackOut
    session: SessionOut


class TopicBreakdown(BaseModel):
    topic_id: uuid.UUID
    topic: str
    correct: int
    total: int
    weak: bool


class RecapOut(BaseModel):
    session_id: uuid.UUID
    score: int
    total: int
    by_topic: list[TopicBreakdown]
    questions: list[FeedbackOut]


class WeakTopicOut(BaseModel):
    topic_id: uuid.UUID
    name: str
    consecutive_correct: int
    updated_at: datetime
