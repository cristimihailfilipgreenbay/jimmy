"""The Study Session graph (docs/architecture.md, section 4.2), for a Quiz or a Test.

    adaptive:     pick Topic (Weak Topics weighted) -> write a question from a passage
                    -> wait for the Student's answer (interrupt) -> grade
                    -> unsure? wait for the Student's Dispute decision (interrupt)
                    -> record -> more? adapt difficulty -> pick ... / done -> finish
    not adaptive: write every question at once (model calls in parallel), then the same
                  answer -> grade -> record loop over the written questions

The graph runs on the Postgres checkpointer, one LangGraph thread per session. It stops at
`await_answer`; `POST /sessions/{id}/answers` resumes it with the answer. An uncertain
grade stops it again at `await_dispute` until the Student decides. A node that fails
(a model error while writing the next question) can be run again from its checkpoint.

State holds plain data only. Everything before `interrupt()` runs again on resume, so
`await_answer` and `await_dispute` do nothing else.
"""

import random
import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.study import questions as q
from app.study.models import (
    Dispute,
    QuizAttempt,
    SessionQuestion,
    StudySession,
    WeakTopic,
)
from app.study.routing import DISPUTE_CONFIDENCE, DISPUTE_MARGIN, needs_dispute
from app.study.selection import next_difficulty, pick_topic
from app.study.service import refresh_weak_topic, weak_topic_ids
from app.study.sources import PassageFinder
from app.topics.models import Topic

SessionFactory = Callable[[], Session]
MC_SHARE = 0.6
# Questions written at the same time when the difficulty does not adapt.
MAX_PARALLEL = 10


class StudyState(TypedDict, total=False):
    session_id: str
    space_id: str
    # "quiz" or "test": a Test shows nothing until the recap, so it never pauses for a
    # Dispute.
    kind: str
    # Whether the difficulty follows the answers (the Student's setting). Not adaptive
    # means every question is written up front. Missing means adaptive.
    adaptive: bool
    topic_ids: list[str]
    total: int
    answered: int
    difficulty: str
    # Correct or not, newest last: what the difficulty adapts to.
    recent: list[bool]
    previous_topic: str | None
    used_chunks: list[str]
    topic_id: str
    question_id: str
    answer: str
    grade: dict
    # "correct", "incorrect" or "unsure": the Student's decision on a disputed grade.
    decision: str | None


def build_study_graph(
    factory: SessionFactory,
    find_passage: PassageFinder,
    question_model,
    grader_model,
    checkpointer,
    rng: random.Random | None = None,
    dispute_confidence: float = DISPUTE_CONFIDENCE,
    dispute_margin: float = DISPUTE_MARGIN,
):
    rng = rng or random.Random()

    def pick(state: StudyState) -> StudyState:
        space_id = uuid.UUID(state["space_id"])
        with factory() as session:
            weak = weak_topic_ids(session, space_id)
        previous = state.get("previous_topic")
        chosen = pick_topic(
            [uuid.UUID(t) for t in state["topic_ids"]],
            weak,
            uuid.UUID(previous) if previous else None,
            rng,
        )
        return {"topic_id": str(chosen)}

    def write_all(state: StudyState) -> StudyState:
        """Every question of the session, written together. Topics and passages are
        chosen one after another (no passage twice), the model calls run in parallel and
        nothing is saved unless every question was written."""
        space_id = uuid.UUID(state["space_id"])
        topic_ids = [uuid.UUID(t) for t in state["topic_ids"]]
        with factory() as session:
            weak = weak_topic_ids(session, space_id)
            used = {uuid.UUID(c) for c in state["used_chunks"]}
            plan = []
            previous = None
            for _ in range(state["total"]):
                topic_id = pick_topic(topic_ids, weak, previous, rng)
                name = session.get(Topic, topic_id).name
                source = find_passage(session, space_id, name, used)
                used.add(uuid.UUID(source["chunk_id"]))
                qtype = q.MULTIPLE_CHOICE if rng.random() < MC_SHARE else q.SHORT_ANSWER
                plan.append(
                    (topic_id, name, source, qtype, random.Random(rng.random()))
                )
                previous = topic_id

            def write(item):
                _topic_id, name, source, qtype, own_rng = item
                return q.generate_question(
                    question_model,
                    passage=source["passage"],
                    topic=name,
                    qtype=qtype,
                    difficulty=state["difficulty"],
                    rng=own_rng,
                )

            with ThreadPoolExecutor(max_workers=min(len(plan), MAX_PARALLEL)) as pool:
                written = list(pool.map(write, plan))
            rows = []
            for position, ((topic_id, _name, source, _t, _r), question) in enumerate(
                zip(plan, written, strict=True), start=1
            ):
                row = SessionQuestion(
                    session_id=uuid.UUID(state["session_id"]),
                    topic_id=topic_id,
                    position=position,
                    question_type=question.type,
                    prompt=question.prompt,
                    options=question.options,
                    answer_key=question.answer_key,
                    explanation=question.explanation,
                    difficulty=state["difficulty"],
                    source_chunk_id=uuid.UUID(source["chunk_id"]),
                    source={k: v for k, v in source.items() if k != "chunk_id"},
                )
                session.add(row)
                rows.append(row)
            session.commit()
            return {
                "question_id": str(rows[0].id),
                "used_chunks": [str(c) for c in used],
            }

    def next_question(state: StudyState) -> StudyState:
        """The next question that was written up front."""
        with factory() as session:
            row = session.scalar(
                select(SessionQuestion).where(
                    SessionQuestion.session_id == uuid.UUID(state["session_id"]),
                    SessionQuestion.position == state["answered"] + 1,
                )
            )
            return {"question_id": str(row.id)}

    def generate(state: StudyState) -> StudyState:
        space_id = uuid.UUID(state["space_id"])
        topic_id = uuid.UUID(state["topic_id"])
        with factory() as session:
            name = session.get(Topic, topic_id).name
            source = find_passage(
                session, space_id, name, {uuid.UUID(c) for c in state["used_chunks"]}
            )
            qtype = q.MULTIPLE_CHOICE if rng.random() < MC_SHARE else q.SHORT_ANSWER
            question = q.generate_question(
                question_model,
                passage=source["passage"],
                topic=name,
                qtype=qtype,
                difficulty=state["difficulty"],
                rng=rng,
            )
            row = SessionQuestion(
                session_id=uuid.UUID(state["session_id"]),
                topic_id=topic_id,
                position=state["answered"] + 1,
                question_type=question.type,
                prompt=question.prompt,
                options=question.options,
                answer_key=question.answer_key,
                explanation=question.explanation,
                difficulty=state["difficulty"],
                source_chunk_id=uuid.UUID(source["chunk_id"]),
                source={k: v for k, v in source.items() if k != "chunk_id"},
            )
            session.add(row)
            session.commit()
            return {
                "question_id": str(row.id),
                "used_chunks": [*state["used_chunks"], source["chunk_id"]],
            }

    def await_answer(state: StudyState) -> StudyState:
        answer = interrupt({"kind": "answer", "question_id": state["question_id"]})
        return {"answer": str(answer)}

    def grade(state: StudyState) -> StudyState:
        with factory() as session:
            row = session.get(SessionQuestion, uuid.UUID(state["question_id"]))
            if row.question_type == q.MULTIPLE_CHOICE:
                result = q.grade_multiple_choice(row.answer_key, state["answer"])
            else:
                result = q.grade_short_answer(
                    grader_model,
                    question=row.prompt,
                    reference=row.answer_key,
                    passage=row.source.get("passage", ""),
                    answer=state["answer"],
                )
        return {
            "grade": {
                "score": result.score,
                "confidence": result.confidence,
                "feedback": result.feedback,
                "correct": result.correct,
            }
        }

    def route(state: StudyState) -> str:
        grade_ = state["grade"]
        if state.get("kind") == "test":
            return "record"
        unsure = needs_dispute(
            grade_["score"],
            grade_["confidence"],
            threshold=dispute_confidence,
            margin=dispute_margin,
        )
        return "await_dispute" if unsure else "record"

    def await_dispute(state: StudyState) -> StudyState:
        decision = interrupt({"kind": "dispute", "question_id": state["question_id"]})
        return {"decision": str(decision)}

    def record(state: StudyState) -> StudyState:
        result = dict(state["grade"])
        decision = state.get("decision")
        with factory() as session:
            row = session.get(SessionQuestion, uuid.UUID(state["question_id"]))
            attempt = QuizAttempt(
                question_id=row.id,
                answer=state["answer"][: q.MAX_ANSWER_CHARS],
                score=result["score"],
                confidence=result["confidence"],
                is_correct=result["correct"],
                graded_by="auto",
                explanation=result["feedback"] or None,
            )
            if decision:
                # The Student's decision overrides the grade (docs/domain.md, rule 7);
                # the automatic one stays in the Dispute.
                # "Not sure" counts as not right, so the Topic is reviewed.
                right = decision == "correct"
                session.add(attempt)
                session.flush()
                session.add(
                    Dispute(
                        attempt_id=attempt.id,
                        auto_score=result["score"],
                        auto_confidence=result["confidence"],
                        decision=decision,
                    )
                )
                attempt.score = 1.0 if right else 0.0
                attempt.is_correct = right
                attempt.graded_by = "student"
                result["correct"] = right
            else:
                session.add(attempt)
            session.flush()
            topic_id = row.topic_id
            refresh_weak_topic(session, uuid.UUID(state["space_id"]), topic_id)
            session.commit()
        return {
            "answered": state["answered"] + 1,
            "recent": [*state["recent"], result["correct"]][-5:],
            "previous_topic": str(topic_id),
            "decision": None,
        }

    def start(state: StudyState) -> str:
        return "pick" if state.get("adaptive", True) else "write_all"

    def more(state: StudyState) -> str:
        if state["answered"] >= state["total"]:
            return "finish"
        return "adapt" if state.get("adaptive", True) else "next_question"

    def adapt(state: StudyState) -> StudyState:
        level = next_difficulty(state["difficulty"], state["recent"])
        with factory() as session:
            session.get(StudySession, uuid.UUID(state["session_id"])).difficulty = level
            session.commit()
        return {"difficulty": level}

    def finish(state: StudyState) -> StudyState:
        with factory() as session:
            row = session.get(StudySession, uuid.UUID(state["session_id"]))
            row.status = "finished"
            row.finished_at = datetime.now(UTC)
            row.score = session.scalar(
                select(func.count())
                .select_from(QuizAttempt)
                .join(SessionQuestion, SessionQuestion.id == QuizAttempt.question_id)
                .where(
                    SessionQuestion.session_id == row.id,
                    QuizAttempt.is_correct.is_(True),
                )
            )
            asked = select(SessionQuestion.topic_id).where(
                SessionQuestion.session_id == row.id
            )
            row.weak_topic_ids = [
                str(t)
                for t in session.scalars(
                    select(WeakTopic.topic_id).where(
                        WeakTopic.space_id == row.space_id,
                        WeakTopic.is_weak.is_(True),
                        WeakTopic.topic_id.in_(asked),
                    )
                )
            ]
            session.commit()
        return {}

    graph = StateGraph(StudyState)
    for name, node in [
        ("write_all", write_all),
        ("next_question", next_question),
        ("pick", pick),
        ("generate", generate),
        ("await_answer", await_answer),
        ("grade", grade),
        ("await_dispute", await_dispute),
        ("record", record),
        ("adapt", adapt),
        ("finish", finish),
    ]:
        graph.add_node(name, node)
    graph.add_conditional_edges(START, start, ["pick", "write_all"])
    graph.add_edge("write_all", "await_answer")
    graph.add_edge("next_question", "await_answer")
    graph.add_edge("pick", "generate")
    graph.add_edge("generate", "await_answer")
    graph.add_edge("await_answer", "grade")
    graph.add_conditional_edges("grade", route, ["await_dispute", "record"])
    graph.add_edge("await_dispute", "record")
    graph.add_conditional_edges("record", more, ["adapt", "next_question", "finish"])
    graph.add_edge("adapt", "pick")
    graph.add_edge("finish", END)
    return graph.compile(checkpointer=checkpointer)
