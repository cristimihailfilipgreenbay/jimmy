# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Jimmy is an AI study tutor for university students (FastAPI + LangGraph backend, React frontend, Postgres/pgvector). **Issues #1, #2, #3, #4, #22, #23 and #28 are built: `docker-compose.yml`, `.env.example`, a FastAPI backend with `/health`, Alembic and the `students`/`spaces` tables, sign-up and sign-in (email and password, JWT cookie), Study Spaces (create, list, delete) owned by the signed-in Student, a five-step onboarding page that every new Student must finish (the app is closed until `onboarded` is true), a backend-only Notes upload (PDF, Markdown, text; scanned, oversized and unsupported files rejected) that chunks, embeds through OpenRouter and stores chunks with `space_id`, the single retrieval function `app/chunks/retrieval.py`, the Tutor chat (`app/chat/`: `create_agent` with `search_notes`, Citation check, step cap and doom-loop stop, SSE over `/threads/{id}/messages`), and a React shell with a sign-in/sign-up page, a Study Spaces page and a Chat screen. the Subject Library (#6: `app/library/`, the seed command, `search_library`, a per-Space switch). Everything else is still to build.** The build is tracked as ordered vertical-slice GitHub issues; each issue names its prerequisites. Frontend: Vite, TypeScript, Tailwind v4, shadcn, oxlint, TanStack Query (React Query) for all server state: fetch through query/mutation hooks in each feature's `queries/` folder, not `useEffect`.

The docs in `docs/` are the source of truth. Read the relevant one before implementing:
`architecture.md` (stack, graphs, test seams), `domain.md` (invariants, lifecycles), `api.md` (HTTP/SSE contract), `database.md` (schema, migration rules), `spec.md` (requirements), `design.md` (product behaviour), `Features.md` (features mapped to issues), `adr/` (decisions).

## Design artifact

A design artifact already exists for the UI: "Jimmy — Study Tutor Prototype" (https://claude.ai/artifact/TSNW2vrvQXEA6QRmi1WLDt). Read it (Artifact tool, `action: "read"`) before building or changing frontend screens, and update that artifact rather than creating a new one.

**Build UI from the prototype's source, not from memory or shadcn defaults.** The artifact saves its full HTML; read the markup, classes and motion for the screen you are building and reproduce them. The theme (colour tokens, Inter and Source Serif 4, radii, focus ring, motion) lives in `frontend/src/index.css`, copied from the prototype. Do not add elements, copy or behaviour the prototype does not have, and do not drop any it has. Where the data does not exist yet (for example a Space's Notes count), keep the element and show the true value. To tint a screen with a Study Space's colour, wrap it in `style={accentStyle(accent)}` (`features/spaces/lib/accents.ts`), then use `bg-space`, `bg-space-soft` and `text-space-ink`.

Deliberate differences from the prototype, asked for by the user (do not "fix" them): Space tabs slide the screen in the direction of the tab (`lib/spaceTabs.ts`, `.tab-next` / `.tab-prev` in `index.css`) instead of only fading; and menu items show their highlight on keyboard focus only (`focus-visible`), so a menu opened with the mouse does not look as if its first item were selected.

## Commands

```bash
cp .env.example .env              # OPENROUTER / TAVILY / LANGSMITH keys come from your shell environment, not .env; never commit .env
docker compose up -d              # db (pgvector), backend (FastAPI), frontend (Vite dev server)
docker compose logs -f backend
docker compose down               # add -v to delete the database volume
docker compose exec backend python -m app.library.seed   # download the OpenStax demo chapters (safe to repeat)
```

Everything configurable lives in `.env` (see `.env.example`): the database (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`; `DATABASE_URL` overrides them when running the backend outside Docker), the published ports (`BACKEND_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT` bound to `127.0.0.1`), `JWT_SECRET` and the session settings. Do not hard-code these in `docker-compose.yml` or the code. The database user and password only apply to a new volume.

The backend runs `alembic upgrade head` on start; demo data (OpenStax Biology/Physics) is loaded by a separate, idempotent seed command (`docker compose exec backend python -m app.library.seed`). Backend tooling: uv, Ruff, pytest. Planned layout: `backend/`, `frontend/`, `eval/`, `data/seed/` (uncommitted), `docs/`.

**Folder layout is feature-based on both sides** (see `docs/architecture.md` section 10): `backend/app/<feature>/{models,schemas,router,dependencies}.py` and `frontend/src/features/<feature>/{schemas,queries,hooks,state,components,lib}/` (only the sub-folders needed). `schemas/` holds the Zod schemas and their `z.infer` types. `queries/` holds everything that talks to the server: request functions, query keys, and the React Query hooks (`useX`, `useCreateX`); `hooks/` is for other hooks, `state/` for client state. A frontend feature is normally a page: its page component sits at the feature root, with no `pages/` folder. Only a very complex dialog, or sometimes a tab, is a feature of its own; otherwise dialogs and tabs go in the page's `components/`. Put new code in its feature, not in a global `routers/`, `models/`, `hooks/` or `pages/` folder. Shared code (`lib/`, `components/ui`, `db.py`, `errors.py`) never imports a feature. A new feature's models must be imported in `backend/migrations/env.py`.

## Architecture essentials

- **Schemas and validation:** Pydantic on the backend (request and response models in each feature's `schemas.py`, `response_model` on routes), Zod on the frontend (a schema per API shape in the feature's `schemas/`, types come from `z.infer`, every response is parsed in `request()`, form input is checked with `safeParse` before it is sent). Keep a Zod schema in step with its Pydantic model.
- **No API versioning:** the browser calls `/api/...`, the dev proxy strips `/api`, and the backend serves from the root (`/spaces`, `/students`, `/health`). Do not add a `/v1` segment.
- Local-only, one signed-in Student per browser. **Auth:** sign up and sign in with email and password; the backend sets a signed JWT in an httpOnly `SameSite=Lax` cookie (`jimmy_session`) and the `current_student` dependency (`backend/app/students/dependencies.py`) is the only place the Student is resolved. Passwords are hashed with argon2. No `X-Student-Id` header and no profile switcher. External services: OpenRouter (chat + embeddings), Tavily, Wikipedia, LangSmith.
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

Commit and push as you go, in commits as small as possible (one concern each), using the subject format below. When the issue is finished, commit, push and open the PR (write the body with the `mattpocock-skills:pr` skill), then tell the user. Never merge the PR: the user reviews and merges it.

The subject line is `#<issue> [Backend|Frontend] <Area> - <Summary>`, for example `#23 [Backend] Spaces - Add endpoint to remove`. If the change is neither backend nor frontend, or touches both, omit the bracketed tag.

## Testing

Unit tests only, for critical backend logic, using a fake model. No integration or frontend tests; real-model checks are manual and evaluation (Ragas, `eval/`) runs outside the test suite. Seams: Weak Topic rule, Promotion gate, Citation check, cost calculation, chunking/citation metadata, grading and Dispute routing, and the retrieval function's `space_id` guard.
