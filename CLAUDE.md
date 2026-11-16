# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Jimmy is an AI study tutor for university students (FastAPI + LangGraph backend, React frontend, Postgres/pgvector). **Issue #1 (walking skeleton) is built: `docker-compose.yml`, `.env.example`, a FastAPI backend with `/health` and Alembic, and a React Router shell. Everything else is still to build.** The build is tracked as ordered vertical-slice GitHub issues; each issue names its prerequisites. Frontend: Vite, TypeScript, Tailwind v4, shadcn, oxlint.

The docs in `docs/` are the source of truth. Read the relevant one before implementing:
`architecture.md` (stack, graphs, test seams), `domain.md` (invariants, lifecycles), `api.md` (HTTP/SSE contract), `database.md` (schema, migration rules), `spec.md` (requirements), `design.md` (product behaviour), `Features.md` (features mapped to issues), `adr/` (decisions).

## Design artifact

A design artifact already exists for the UI: "Jimmy — Study Tutor Prototype" (https://claude.ai/artifact/TSNW2vrvQXEA6QRmi1WLDt). Read it (Artifact tool, `action: "read"`) before building or changing frontend screens, and update that artifact rather than creating a new one.

## Commands

```bash
cp .env.example .env              # fill in OPENROUTER / TAVILY / LANGSMITH keys; never commit .env
docker compose up -d              # db (pgvector), backend (FastAPI), frontend (Vite dev server)
docker compose logs -f backend
docker compose down               # add -v to delete the database volume
```

The backend runs `alembic upgrade head` on start; demo data (OpenStax Biology/Physics) is loaded by a separate, idempotent seed command. Backend tooling: uv, Ruff, pytest. Planned layout: `backend/`, `frontend/`, `eval/`, `data/seed/` (uncommitted), `docs/`.

## Architecture essentials

- Local-only, single Student at a time (profile switcher sets `student_id`; no login). External services: OpenRouter (chat + embeddings), Tavily, Wikipedia, LangSmith.
- Three LangGraph pieces: **Tutor chat** (`create_agent` ReAct with tools `search_notes`, `search_library`, `search_wikipedia`, `search_web`, `compare_sources`, `promote_finding`, `record_quiz_result`, `save_flashcards`), **Study Session** (`StateGraph` for Quiz/Test: pick Topics → generate → grade → record → adapt), **Ingestion** (`StateGraph`: extract → page-aware chunk → extract Topics → Topic review pause → embed → store).
- Human-in-the-loop uses LangGraph `interrupt()` with the Postgres checkpointer. FastAPI streams runs over SSE with typed events (`token`, `tool_call`, `citation`, `cost`, `interrupt`, `done`); the client continues with `POST /threads/{id}/resume`.
- Tutor chat middleware: input guard (NeMo), Notes/Findings treated as data not instructions, iteration cap 8, doom-loop stop at 3 identical calls, Citation check on every answer.
- One Postgres holds app data, vectors and checkpoints. Models are chosen by env: `TUTOR_MODEL`, `BACKGROUND_MODEL`, `EMBEDDING_MODEL` (locked once chunks exist).

## Rules that must not be broken

- **Isolation (ADR 0001):** every chunk has a `space_id`, and exactly one retrieval function, which requires `space_id`, may query chunks. No other code path queries chunks directly.
- **Learned Material (ADR 0002):** promoted web Findings are labelled "web-sourced, unreviewed" and are excluded from Quizzes, Tests and Flashcards until the Student approves them. Promoted text is injection-scanned before storage.
- Tutor Knowledge (model's own knowledge) is never used to build quizzes or flashcards.
- Migrations: Alembic, reviewed by hand, never edit one already applied.
- **Use the glossary** (`docs/GLOSSARY.md`) for names in code, docs and UI: Study Space (not course/workspace), Student (not user), Notes (not files/uploads), Finding, Promotion, Learned Material, Citation, Conflict. Every Study Space resource is addressed under its `space_id`.

## Finishing an issue

When an issue is finished, draft a git commit message for it and show it to the user. Do not commit or push unless asked.

The subject line is `#<issue> [Backend|Frontend] <Area> - <Summary>`, for example `#23 [Backend] Spaces - Add endpoint to remove`. If the change is neither backend nor frontend, or touches both, omit the bracketed tag.

## Testing

Unit tests only, for critical backend logic, using a fake model. No integration or frontend tests; real-model checks are manual and evaluation (Ragas, `eval/`) runs outside the test suite. Seams: Weak Topic rule, Promotion gate, Citation check, cost calculation, chunking/citation metadata, grading and Dispute routing, and the retrieval function's `space_id` guard.
