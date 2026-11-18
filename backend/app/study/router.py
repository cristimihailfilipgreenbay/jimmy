import logging
import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response
from langgraph.types import Command
from sqlalchemy import func, select, tuple_
from sqlalchemy.orm import Session

from app.chat.agent import ModelNotConfigured
from app.chat.models import Thread
from app.db import SessionDep
from app.errors import ApiError
from app.pagination import (
    CursorPage,
    CursorQuery,
    LimitQuery,
    PageDep,
    decode_cursor,
    next_cursor,
)
from app.spaces.dependencies import get_owned_space
from app.spaces.models import Space
from app.students.dependencies import StudentDep
from app.students.models import Profile
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
    HistoryOut,
    PastSessionOut,
    PastSessionsOut,
    QuestionOut,
    RecapOut,
    SessionIn,
    SessionOut,
    SourceOut,
    TakenOut,
    TopicBreakdown,
    WeakTopicOut,
)
from app.study.service import clear_weak_topic, remembers_weak_topics, topic_names
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
        .order_by(SessionQuestion.position)
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
                correct_answer=(
                    "\n".join(q.rubric_of(question.answer_key))
                    if question.question_type == q.ESSAY
                    else question.answer_key
                ),
                score=grade["score"],
                confidence=grade["confidence"],
                source=SourceOut(**question.source),
            )
    return None


def _question_out(session: Session, question: SessionQuestion) -> QuestionOut:
    name = topic_names(session, [question.topic_id]).get(question.topic_id, "")
    return QuestionOut(
        id=question.id,
        topic_id=question.topic_id,
        topic=name,
        position=question.position,
        type=question.question_type,
        prompt=question.prompt,
        options=question.options,
        difficulty=question.difficulty,
    )


def _session_out(session: Session, study: StudySession) -> SessionOut:
    question = _current(session, study) if study.status == "active" else None
    current = _question_out(session, question) if question else None
    return SessionOut(
        id=study.id,
        thread_id=study.thread_id,
        space_id=study.space_id,
        kind=study.kind,
        format=study.format,
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
    elif question.question_type == q.ESSAY:
        correct_answer = "\n".join(q.rubric_of(question.answer_key))
        shown = attempt.answer
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
        criteria=attempt.criteria,
        source=SourceOut(**question.source),
        topic_weak=bool(weak and weak.is_weak)
        and remembers_weak_topics(session, space_id),
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


def _title(body: SessionIn) -> str:
    if body.kind == "test":
        return "Test"
    return {"short_answer": "Short answers", "essay": "Essay"}.get(body.format, "Quiz")


@router.post("/spaces/{space_id}/sessions", response_model=SessionOut, status_code=201)
def start_session(
    body: SessionIn, space: SpaceDep, student: StudentDep, session: SessionDep
):
    """Start a Quiz or a Test. The first question is written before this returns."""
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
            409, "no_topics", "Upload Notes and review their Topics before studying."
        )
    by_id = {t.id: t for t in topics}
    if body.topic_ids:
        missing = [t for t in body.topic_ids if t not in by_id]
        if missing:
            raise ApiError(404, "topic_not_found", "That Topic does not exist.")
        chosen = list(dict.fromkeys(body.topic_ids))
    else:
        chosen = list(by_id)
    thread = Thread(
        space_id=space.id,
        kind="session",
        title=_title(body),
    )
    session.add(thread)
    session.flush()
    study = StudySession(
        space_id=space.id,
        thread_id=thread.id,
        kind=body.kind,
        format="mixed" if body.kind == "test" else body.format,
        question_count=body.question_count,
        topic_ids=[str(t) for t in chosen],
    )
    session.add(study)
    session.commit()
    profile = session.get(Profile, student.id)
    try:
        _run(
            study,
            {
                "session_id": str(study.id),
                "space_id": str(space.id),
                "kind": study.kind,
                "format": study.format,
                "adaptive": bool(profile and profile.adaptive_difficulty),
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


@router.get("/spaces/{space_id}/sessions", response_model=PastSessionsOut)
def list_sessions(
    space: SpaceDep,
    session: SessionDep,
    page: PageDep,
    kind: Annotated[Literal["quiz", "test"] | None, Query()] = None,
):
    """One page of the Study Space's finished Quizzes and Tests, newest first."""
    finished_in_space = (
        StudySession.space_id == space.id,
        StudySession.status == "finished",
    )
    matching = finished_in_space + ((StudySession.kind == kind,) if kind else ())
    total_all = session.scalar(
        select(func.count()).select_from(StudySession).where(*finished_in_space)
    )
    total = session.scalar(
        select(func.count()).select_from(StudySession).where(*matching)
    )
    finished = session.scalars(
        select(StudySession)
        .where(*matching)
        .order_by(StudySession.finished_at.desc(), StudySession.id)
        .limit(page.page_size)
        .offset(page.offset)
    ).all()
    asked: dict[uuid.UUID, list[uuid.UUID]] = {s.id: [] for s in finished}
    for session_id, topic_id in session.execute(
        select(SessionQuestion.session_id, SessionQuestion.topic_id)
        .where(SessionQuestion.session_id.in_(asked))
        .order_by(SessionQuestion.session_id, SessionQuestion.position)
    ):
        asked[session_id].append(topic_id)
    wanted = {t for ids in asked.values() for t in ids}
    wanted |= {uuid.UUID(t) for s in finished for t in s.weak_topic_ids}
    names = topic_names(session, list(wanted))
    items = [
        PastSessionOut(
            id=s.id,
            kind=s.kind,
            finished_at=s.finished_at,
            score=s.score or 0,
            total=len(asked[s.id]),
            topics=[names[t] for t in dict.fromkeys(asked[s.id]) if t in names],
            weak_left=[
                names[uuid.UUID(t)] for t in s.weak_topic_ids if uuid.UUID(t) in names
            ],
        )
        for s in finished
    ]
    return PastSessionsOut(items=items, total=total, total_all=total_all)


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
    if question.question_type != q.ESSAY and len(body.answer) > q.MAX_ANSWER_CHARS:
        raise ApiError(422, "invalid_answer", "That answer is too long.")
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
        # A Test withholds the feedback until the recap.
        feedback=_feedback(session, question, attempt)
        if attempt and study.kind == "quiz"
        else None,
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


def _answered_rows(session: Session, study: StudySession):
    return session.execute(
        select(SessionQuestion, QuizAttempt)
        .join(QuizAttempt, QuizAttempt.question_id == SessionQuestion.id)
        .where(SessionQuestion.session_id == study.id)
        .order_by(SessionQuestion.position)
    ).all()


@router.get("/sessions/{session_id}/history", response_model=HistoryOut)
def history(study: StudySessionDep, session: SessionDep):
    """What the Student has already seen in this session, for picking it up again after
    a reload. A Quiz returns its feedback; a Test only the answers given."""
    rows = _answered_rows(session, study)
    if study.kind == "test":
        return HistoryOut(
            feedback=[],
            taken=[
                TakenOut(
                    question=_question_out(session, question), answer=attempt.answer
                )
                for question, attempt in rows
            ],
        )
    return HistoryOut(
        feedback=[_feedback(session, question, attempt) for question, attempt in rows],
        taken=[],
    )


@router.get("/sessions/{session_id}/recap", response_model=RecapOut)
def recap(study: StudySessionDep, session: SessionDep):
    if study.status != "finished":
        raise ApiError(409, "session_not_finished", "This session is still going.")
    rows = _answered_rows(session, study)
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
    weak_names = topic_names(session, [uuid.UUID(t) for t in study.weak_topic_ids])
    return RecapOut(
        session_id=study.id,
        kind=study.kind,
        finished_at=study.finished_at,
        weak_left=[
            weak_names[uuid.UUID(t)]
            for t in study.weak_topic_ids
            if uuid.UUID(t) in weak_names
        ],
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


@router.get("/spaces/{space_id}/weak-topics", response_model=CursorPage[WeakTopicOut])
def list_weak_topics(
    space: SpaceDep,
    session: SessionDep,
    limit: LimitQuery = 30,
    cursor: CursorQuery = None,
):
    """The Space's weak Topics by name, thirty at a time."""
    weak = (WeakTopic.space_id == space.id, WeakTopic.is_weak.is_(True))
    after = ()
    if cursor:
        name, topic_id = decode_cursor(cursor, 2)
        try:
            after = (tuple_(Topic.name, Topic.id) > tuple_(name, uuid.UUID(topic_id)),)
        except ValueError as exc:
            raise ApiError(
                422, "invalid_cursor", "That page link is not valid."
            ) from exc
    rows = session.execute(
        select(WeakTopic, Topic.name)
        .join(Topic, Topic.id == WeakTopic.topic_id)
        .where(*weak, *after)
        .order_by(Topic.name, Topic.id)
        .limit(limit + 1)
    ).all()
    total = session.scalar(select(func.count()).select_from(WeakTopic).where(*weak))
    return CursorPage(
        items=[
            WeakTopicOut(
                topic_id=w.topic_id,
                name=name,
                consecutive_correct=w.consecutive_correct,
                updated_at=w.updated_at,
            )
            for w, name in rows[:limit]
        ],
        next_cursor=next_cursor(rows, limit, lambda r: [r[1], str(r[0].topic_id)]),
        total=total,
    )


@router.delete("/spaces/{space_id}/weak-topics", status_code=204)
def clear_all_weak_topics(space: SpaceDep, session: SessionDep):
    """Clear every weak Topic of the Space at once."""
    for weak in session.scalars(
        select(WeakTopic).where(
            WeakTopic.space_id == space.id, WeakTopic.is_weak.is_(True)
        )
    ):
        clear_weak_topic(session, space.id, weak.topic_id)
    session.commit()
    return Response(status_code=204)


@router.delete("/weak-topics", status_code=204)
def clear_every_weak_topic(student: StudentDep, session: SessionDep):
    """Clear every weak Topic in every one of the Student's Study Spaces."""
    for weak in session.scalars(
        select(WeakTopic)
        .join(Space, Space.id == WeakTopic.space_id)
        .where(Space.student_id == student.id, WeakTopic.is_weak.is_(True))
    ).all():
        clear_weak_topic(session, weak.space_id, weak.topic_id)
    session.commit()
    return Response(status_code=204)


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
