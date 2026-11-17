"""The report as Markdown."""

from datetime import UTC, datetime

from eval.checks import Score
from eval.tutor import Answer


def pct(value: float | None) -> str:
    return "n/a" if value is None else f"{value * 100:.0f}%"


def _cell(text: str, limit: int = 160) -> str:
    text = " ".join(text.split())
    text = text if len(text) <= limit else text[: limit - 1] + "…"
    return text.replace("|", "\\|")


def render(scores: list[Score], answers: list[Answer], models: dict[str, str]) -> str:
    when = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# Evaluation report",
        "",
        f"Run on {when}. Command: `docker compose exec backend python -m eval.run`.",
        "",
        "Models: " + ", ".join(f"{k} `{v}`" for k, v in models.items()) + ".",
        "",
        "## Scores",
        "",
        "| Metric | Score | Items scored | What it measures |",
        "|---|---|---|---|",
    ]
    for s in scores:
        lines.append(
            f"| {s.name} | **{pct(s.value)}** | {s.n} of {s.total} | {s.note} |"
        )
    lines += [
        "",
        (
            "Ragas scores are averages over the answerable questions (Notes, Library, "
            "web) that found at least one passage. Higher is better except where noted."
        ),
        "",
        "## Golden set",
        "",
        "| Id | Space | Kind | Question | Citations | Answer |",
        "|---|---|---|---|---|---|",
    ]
    for a in answers:
        shown = f"error: {a.error}" if a.error else _cell(a.text)
        lines.append(
            f"| {a.id} | {a.space} | {a.category} | {_cell(a.question, 80)} "
            f"| {len(a.cited)} | {shown} |"
        )
    return "\n".join(lines) + "\n"
