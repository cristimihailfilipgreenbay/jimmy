import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from langgraph.types import Command
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.chat.agent import ModelNotConfigured
from app.chat.models import Thread
from app.db import SessionDep
from app.errors import ApiError
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space
from app.study import questions as q
from app.study.dependencies import StudySessionDep
from app.study.models import (
    Dispute,
    QuizAttempt,
    SessionQuestion,
    StudySession,
    WeakTopic,
)
from app.study.runtime import get_study_graph
from app.study.schemas import (
    AnswerIn,
    AnswerOut,
    DisputeOut,
    DisputeRecordOut,
    FeedbackOut,
    QuestionOut,
    RecapOut,
    SessionIn,
    SessionOut,
    SourceOut,
    TopicBreakdown,
    WeakTopicOut,
)
from app.study.service import clear_weak_topic, topic_names
from app.study.sources import NoSource
from app.topics.models import Topic

log = logging.getLogger(__name__)
router = APIRouter(tags=["study"])

SpaceDep = Annotated[Space, Depends(get_owned_space)]


def _config(study: StudySession) -> dict:
    return {"configurable": {"thread_id": str(study.id)}}


def _current(session: Session, study: StudySession) -> SessionQuestion | None:
    answered = select(QuizAttempt.question_id)
    return session.scalar(
        select(SessionQuestion)
        .where(
            SessionQuestion.session_id == study.id,
            SessionQuestion.id.not_in(answered),
        )
        .order_by(SessionQuestion.position.desc())
        .limit(1)
    )


def _answered(session: Session, study: StudySession) -> int:
    return len(
        session.scalars(
            select(QuizAttempt.id)
            .join(SessionQuestion, SessionQuestion.id == QuizAttempt.question_id)
            .where(SessionQuestion.session_id == study.id)
        ).all()
    )


def _pending_dispute(
    session: Session, study: StudySession, question: SessionQuestion | None
) -> DisputeOut | None:
    """The Dispute the run is paused on, built from the saved run and the question."""
    if question is None:
        return None
    state = get_study_graph().get_state(_config(study))
    for task in state.tasks:
        for pause in task.interrupts:
            if dict(pause.value).get("kind") != "dispute":
                continue
            grade = state.values["grade"]
            name = topic_names(session, [question.topic_id]).get(question.topic_id, "")
            return DisputeOut(
                interrupt_id=pause.id,
                question_id=question.id,
                topic=name,
                prompt=question.prompt,
                answer=state.values["answer"],
                correct_answer=question.answer_key,
                score=grade["score"],
                confidence=grade["confidence"],
                source=SourceOut(**question.source),
            )
    return None


def _session_out(session: Session, study: StudySession) -> SessionOut:
    question = _current(session, study) if study.status == "active" else None
    current = None
    if question:
        name = topic_names(session, [question.topic_id]).get(question.topic_id, "")
        current = QuestionOut(
            id=question.id,
            topic_id=question.topic_id,
            topic=name,
            position=question.position,
            type=question.question_type,
            prompt=question.prompt,
            options=question.options,
            difficulty=question.difficulty,
        )
    return SessionOut(
        id=study.id,
        space_id=study.space_id,
        kind=study.kind,
        status=study.status,
        question_count=study.question_count,
        answered=_answered(session, study),
        difficulty=study.difficulty,
        current=current,
        dispute=_pending_dispute(session, study, question),
        started_at=study.started_at,
    )


def _feedback(
    session: Session, question: SessionQuestion, attempt: QuizAttempt
) -> FeedbackOut:
    space_id = session.get(StudySession, question.session_id).space_id
    weak = session.get(WeakTopic, (space_id, question.topic_id))
    dispute = session.scalar(select(Dispute).where(Dispute.attempt_id == attempt.id))
    if question.question_type == q.MULTIPLE_CHOICE:
        correct_answer = question.options[int(question.answer_key)]
        shown = _option_text(question, attempt.answer)
    else:
        correct_answer, shown = question.answer_key, attempt.answer
    return FeedbackOut(
        question_id=question.id,
        position=question.position,
        topic_id=question.topic_id,
        topic=topic_names(session, [question.topic_id]).get(question.topic_id, ""),
        type=question.question_type,
        prompt=question.prompt,
        options=question.options,
        answer=shown,
        correct=attempt.is_correct,
        graded_by=attempt.graded_by,
        decision=dispute.decision if dispute else None,
        score=float(attempt.score),
        correct_answer=correct_answer,
        explanation=question.explanation,
        note=attempt.explanation,
        source=SourceOut(**question.source),
        topic_weak=bool(weak and weak.is_weak),
    )


def _option_text(question: SessionQuestion, answer: str) -> str:
    try:
        return question.options[int(answer)]
    except (ValueError, IndexError, TypeError):
        return answer


def _run(study: StudySession, payload) -> None:
    """Run the graph to its next pause, turning its failures into API errors."""
    try:
        get_study_graph().invoke(payload, _config(study))
    except NoSource as exc:
        raise ApiError(409, "no_sources", str(exc)) from exc
    except ModelNotConfigured as exc:
        raise ApiError(502, "upstream_unavailable", str(exc)) from exc
    except Exception as exc:
        log.exception("Study session %s failed", study.id)
        raise ApiError(
            502,
            "upstream_unavailable",
            "Jimmy could not write the next question. Try again in a moment.",
        ) from exc


@router.post("/spaces/{space_id}/sessions", response_model=SessionOut, status_code=201)
def start_session(body: SessionIn, space: SpaceDep, session: SessionDep):
    """Start a Quiz. The first question is written before this returns."""
    topics = list(
        session.scalars(
            select(Topic).where(
                Topic.space_id == space.id,
                Topic.merged_into_id.is_(None),
                Topic.status == "approved",
            )
        )
    )
    if not topics:
        raise ApiError(
            409, "no_topics", "Upload Notes and review their Topics before a Quiz."
        )
    by_id = {t.id: t for t in topics}
    if body.topic_ids:
        missing = [t for t in body.topic_ids if t not in by_id]
        if missing:
            raise ApiError(404, "topic_not_found", "That Topic does not exist.")
        chosen = list(dict.fromkeys(body.topic_ids))
    else:
        chosen = list(by_id)
    thread = Thread(space_id=space.id, kind="session", title="Quiz")
    session.add(thread)
    session.flush()
    study = StudySession(
        space_id=space.id,
        thread_id=thread.id,
        kind=body.kind,
        question_count=body.question_count,
        topic_ids=[str(t) for t in chosen],
    )
    session.add(study)
    session.commit()
    try:
        _run(
            study,
            {
                "session_id": str(study.id),
                "space_id": str(space.id),
                "topic_ids": study.topic_ids,
                "total": study.question_count,
                "answered": 0,
                "difficulty": study.difficulty,
                "recent": [],
                "previous_topic": None,
                "used_chunks": [],
            },
        )
    except ApiError:
        # A session that never asked anything is not worth keeping.
        session.delete(thread)
        session.commit()
        raise
    session.refresh(study)
    return _session_out(session, study)


@router.get("/sessions/{session_id}", response_model=SessionOut)
def get_session(study: StudySessionDep, session: SessionDep):
    if study.status == "active" and _current(session, study) is None:
        # The last question could not be written; run that step again.
        _run(study, None)
        session.refresh(study)
    return _session_out(session, study)


@router.post("/sessions/{session_id}/answers", response_model=AnswerOut)
def answer(body: AnswerIn, study: StudySessionDep, session: SessionDep):
    question = _current(session, study) if study.status == "active" else None
    if question is None or question.id != body.question_id:
        raise ApiError(
            409, "question_not_current", "That question is not waiting for an answer."
        )
    if question.question_type == q.MULTIPLE_CHOICE and body.answer.strip() not in {
        str(i) for i in range(len(question.options))
    }:
        raise ApiError(422, "invalid_answer", "Choose one of the options.")
    if _pending_dispute(session, study, question):
        raise ApiError(
            409, "dispute_pending", "Decide on the grade before the next answer."
        )
    return _resume(study, question, body.answer, session)


def _resume(
    study: StudySession, question: SessionQuestion, value: str, session: Session
) -> AnswerOut:
    """Continue the run with an answer or a Dispute decision and return what the Student
    sees: their feedback, or the Dispute the grade has raised."""
    try:
        _run(study, Command(resume=value))
    except ApiError:
        session.expire_all()
        # The answer is recorded before the next question is written; if only that
        # failed, the Student still gets their feedback.
        if _attempt(session, question) is None:
            raise
    session.expire_all()
    session.refresh(study)
    attempt = _attempt(session, question)
    return AnswerOut(
        feedback=_feedback(session, question, attempt) if attempt else None,
        session=_session_out(session, study),
    )


def _attempt(session: Session, question: SessionQuestion) -> QuizAttempt | None:
    return session.scalar(
        select(QuizAttempt).where(QuizAttempt.question_id == question.id)
    )


def resume_dispute(
    interrupt_id: str, decision: str, thread: Thread, session: Session
) -> AnswerOut:
    """The Student's decision on a Dispute, from POST /threads/{id}/resume."""
    study = session.scalar(
        select(StudySession).where(StudySession.thread_id == thread.id)
    )
    question = _current(session, study) if study and study.status == "active" else None
    pending = _pending_dispute(session, study, question) if study else None
    if pending is None or pending.interrupt_id != interrupt_id:
        raise ApiError(409, "nothing_to_resume", "There is nothing to answer here.")
    if decision not in ("correct", "incorrect", "unsure"):
        raise ApiError(422, "invalid_decision", "Choose yes, no or not sure.")
    return _resume(study, question, decision, session)


@router.get("/sessions/{session_id}/recap", response_model=RecapOut)
def recap(study: StudySessionDep, session: SessionDep):
    if study.status != "finished":
        raise ApiError(409, "session_not_finished", "This session is still going.")
    rows = session.execute(
        select(SessionQuestion, QuizAttempt)
        .join(QuizAttempt, QuizAttempt.question_id == SessionQuestion.id)
        .where(SessionQuestion.session_id == study.id)
        .order_by(SessionQuestion.position)
    ).all()
    feedback = [_feedback(session, question, attempt) for question, attempt in rows]
    by_topic: dict[uuid.UUID, TopicBreakdown] = {}
    for f in feedback:
        row = by_topic.setdefault(
            f.topic_id,
            TopicBreakdown(
                topic_id=f.topic_id,
                topic=f.topic,
                correct=0,
                total=0,
                weak=f.topic_weak,
            ),
        )
        row.total += 1
        row.correct += int(f.correct)
    return RecapOut(
        session_id=study.id,
        score=study.score or 0,
        total=len(feedback),
        by_topic=list(by_topic.values()),
        questions=feedback,
    )


@router.get("/spaces/{space_id}/disputes", response_model=list[DisputeRecordOut])
def list_disputes(space: SpaceDep, session: SessionDep):
    """Past Disputes, newest first."""
    rows = session.execute(
        select(Dispute, QuizAttempt, SessionQuestion)
        .join(QuizAttempt, QuizAttempt.id == Dispute.attempt_id)
        .join(SessionQuestion, SessionQuestion.id == QuizAttempt.question_id)
        .join(StudySession, StudySession.id == SessionQuestion.session_id)
        .where(StudySession.space_id == space.id)
        .order_by(Dispute.created_at.desc())
    ).all()
    names = topic_names(session, [question.topic_id for _, _, question in rows])
    return [
        DisputeRecordOut(
            id=dispute.id,
            topic_id=question.topic_id,
            topic=names.get(question.topic_id, ""),
            prompt=question.prompt,
            answer=attempt.answer,
            auto_score=float(dispute.auto_score),
            auto_confidence=float(dispute.auto_confidence),
            decision=dispute.decision,
            created_at=dispute.created_at,
        )
        for dispute, attempt, question in rows
    ]


@router.get("/spaces/{space_id}/weak-topics", response_model=list[WeakTopicOut])
def list_weak_topics(space: SpaceDep, session: SessionDep):
    rows = session.execute(
        select(WeakTopic, Topic.name)
        .join(Topic, Topic.id == WeakTopic.topic_id)
        .where(WeakTopic.space_id == space.id, WeakTopic.is_weak.is_(True))
        .order_by(Topic.name)
    ).all()
    return [
        WeakTopicOut(
            topic_id=w.topic_id,
            name=name,
            consecutive_correct=w.consecutive_correct,
            updated_at=w.updated_at,
        )
        for w, name in rows
    ]


@router.delete("/spaces/{space_id}/weak-topics/{topic_id}", status_code=204)
def clear_weak_topic_route(space: SpaceDep, topic_id: uuid.UUID, session: SessionDep):
    """The Student says the Topic is fine: it stops being weak and its old answers stop
    counting."""
    topic = session.get(Topic, topic_id)
    if topic is None or topic.space_id != space.id:
        raise ApiError(404, "topic_not_found", "That Topic does not exist.")
    clear_weak_topic(session, space.id, topic_id)
    session.commit()
    return Response(status_code=204)
