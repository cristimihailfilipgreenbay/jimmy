import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.study.questions import MAX_ESSAY_CHARS


class SessionIn(BaseModel):
    kind: Literal["quiz", "test"] = "quiz"
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


class CriterionOut(BaseModel):
    """One rubric line of an Essay: how well it was met (0, 0.5 or 1) and why."""

    criterion: str
    met: float
    comment: str


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
    # Whether the Student's own decision set this result.
    graded_by: str = "auto"
    # The Student's decision on a Dispute: correct, incorrect or unsure.
    decision: str | None = None
    # The grader's note on a written answer.
    note: str | None
    # Essay only: the rubric and how the answer did against it.
    criteria: list[CriterionOut] | None = None
    source: SourceOut
    # Whether the Topic is weak now.
    topic_weak: bool


class DisputeOut(BaseModel):
    """A grade the grader was unsure of: the Student's answer beside the Source passage."""

    interrupt_id: str
    question_id: uuid.UUID
    topic: str
    prompt: str
    answer: str
    correct_answer: str
    score: float
    confidence: float
    source: SourceOut


class DisputeRecordOut(BaseModel):
    """A past Dispute."""

    id: uuid.UUID
    topic_id: uuid.UUID
    topic: str
    prompt: str
    answer: str
    auto_score: float
    auto_confidence: float
    decision: str
    created_at: datetime


class SessionOut(BaseModel):
    id: uuid.UUID
    # A Dispute is answered at POST /threads/{thread_id}/resume.
    thread_id: uuid.UUID
    space_id: uuid.UUID
    kind: str
    status: str
    question_count: int
    answered: int
    difficulty: str
    current: QuestionOut | None
    # Set while the run waits for the Student to decide on a grade.
    dispute: DisputeOut | None = None
    started_at: datetime


class AnswerIn(BaseModel):
    question_id: uuid.UUID
    answer: str = Field(min_length=1, max_length=MAX_ESSAY_CHARS)


class AnswerOut(BaseModel):
    # None while a Dispute waits for the Student; the decision returns the feedback.
    feedback: FeedbackOut | None
    session: SessionOut


class TakenOut(BaseModel):
    """A Test question the Student already answered, with their answer (an option number
    for multiple choice). A Test shows nothing more until the recap."""

    question: QuestionOut
    answer: str


class HistoryOut(BaseModel):
    """What a session already showed the Student, so a reloaded page can go on where it
    was: the feedback of a Quiz, or the answers given in a Test."""

    feedback: list[FeedbackOut]
    taken: list[TakenOut]


class TopicBreakdown(BaseModel):
    topic_id: uuid.UUID
    topic: str
    correct: int
    total: int
    weak: bool


class PastSessionOut(BaseModel):
    """A finished Quiz or Test, one row of the past sessions list."""

    id: uuid.UUID
    kind: str
    finished_at: datetime
    score: int
    # Questions asked.
    total: int
    # Topic names, in the order they were first asked.
    topics: list[str]
    # Names of the Topics that were weak when the session finished.
    weak_left: list[str]


class PastSessionsOut(BaseModel):
    """One page of past sessions."""

    items: list[PastSessionOut]
    # Sessions that match the filter, across all pages.
    total: int
    # Every finished session, whatever the filter.
    total_all: int


class RecapOut(BaseModel):
    session_id: uuid.UUID
    kind: str
    finished_at: datetime | None
    weak_left: list[str]
    score: int
    total: int
    by_topic: list[TopicBreakdown]
    questions: list[FeedbackOut]


class WeakTopicOut(BaseModel):
    topic_id: uuid.UUID
    name: str
    consecutive_correct: int
    updated_at: datetime
