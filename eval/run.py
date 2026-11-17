"""One command, one report.

    docker compose exec backend python -m eval.run [--rebuild]

Needs OPENROUTER_API_KEY, TUTOR_MODEL and BACKGROUND_MODEL (EVAL_JUDGE_MODEL overrides the judge), and the Subject Library seeded
(`python -m app.library.seed`). It calls real models, so it costs a little money and is
not part of the test suite. The report is written to `eval/report.md`.
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path

import app.main  # noqa: F401  (imports every model, so all tables are known)
from app.config import get_settings
from app.guardrails.classify import openrouter_model
from eval import checks, corpus, report, tutor

JUDGE_MODEL = "google/gemini-3.8-flash"
REPORT = Path(__file__).parent / "report.md"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the Jimmy evaluation.")
    parser.add_argument(
        "--rebuild", action="store_true", help="re-index the eval Spaces"
    )
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.WARNING)
    logging.getLogger().setLevel(logging.WARNING)
    for noisy in ("httpx", "httpx2", "httpcore", "openai"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    settings = get_settings()
    if not settings.openrouter_api_key or not settings.tutor_model:
        print("OPENROUTER_API_KEY and TUTOR_MODEL must be set.", file=sys.stderr)
        return 2
    # The judge is a different model family from the Tutor and the writer, so it does
    # not favour their wording.
    judge_name = os.environ.get("EVAL_JUDGE_MODEL") or JUDGE_MODEL
    judge_model = openrouter_model(judge_name)
    writer = openrouter_model(settings.background_model)
    if writer is None:
        print("BACKGROUND_MODEL must be set.", file=sys.stderr)
        return 2

    print("Preparing the evaluation Study Spaces…")
    spaces = corpus.build(rebuild=args.rebuild)

    items = json.loads(tutor.GOLDEN.read_text())
    answers = []
    for item in items:
        print(f"  {item['id']} {item['question']}")
        answers.append(tutor.ask(item, spaces[item["space"]]))

    print("Scoring with Ragas…")
    scores = checks.ragas_scores(answers, judge_model)
    print("Checking Citations…")
    scores += checks.citation_scores(answers, judge_model)
    scores.append(checks.abstention_score(answers))
    print("Checking answer keys…")
    scores.append(checks.answer_key_score(spaces, writer, judge_model))
    print("Checking Conflict detection…")
    scores += checks.conflict_scores(writer)

    models = {
        "Tutor": settings.tutor_model,
        "question writer and Conflict comparer": settings.background_model,
        "judge": judge_name,
        "embeddings": settings.embedding_model,
    }
    REPORT.write_text(report.render(scores, answers, models))
    print(f"\nReport saved to {REPORT}\n")
    for s in scores:
        print(f"{s.name:<48} {report.pct(s.value)}  ({s.n}/{s.total})")
    return 0 if all(s.value is not None for s in scores) else 1


if __name__ == "__main__":
    raise SystemExit(main())
