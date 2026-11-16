# Jimmy

An AI study tutor for university students, built with FastAPI, LangGraph and React. This README is for developers: how to get the project running and where things live. For what Jimmy is and does, start with [docs/overview.md](docs/overview.md).

> **Status:** issue #1 (walking skeleton) is done: the stack starts with one command, the backend exposes `/health` and the frontend shows the route shell. Everything else is still to build. The build is tracked in [GitHub issues](https://github.com/cristimihailfilipgreenbay/jimmy/issues), in order.

## Stack

Python, FastAPI, SQLAlchemy and Alembic, LangChain and LangGraph, LangSmith, OpenRouter, Postgres with pgvector, React, React Router, shadcn. Everything runs locally with Docker Compose.

## Prerequisites

- Docker with Docker Compose
- An [OpenRouter](https://openrouter.ai) API key (chat and embeddings)
- A [Tavily](https://tavily.com) API key (web search)
- A [LangSmith](https://smith.langchain.com) API key (tracing)

## Getting started

```bash
git clone git@github.com:cristimihailfilipgreenbay/jimmy.git
cd jimmy
cp .env.example .env     # then fill in the keys
docker compose up -d
```

`docker compose up -d` starts three services in the background: `db` (Postgres with pgvector), `backend` (FastAPI) and `frontend` (React dev server). The backend applies database migrations when it starts.

Useful commands:

```bash
docker compose logs -f backend   # follow a service's logs
docker compose ps                # check that all three are running
docker compose down              # stop everything (add -v to also delete the database volume)
```

Demo data (open-licensed OpenStax chapters for Biology and Physics) is loaded separately with a seed command, so it is safe to run more than once:

```bash
docker compose exec backend python -m app.library.seed
```

It downloads the two books (about 660 MB, once), keeps three chapters of each in `data/seed/` with an `ATTRIBUTION.md`, and registers the packs. A Study Space then attaches a pack from its Subject Library switch.

### Configuration

All settings come from `.env`. Names are proposals until `.env.example` exists.

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | Chat and embedding calls |
| `TAVILY_API_KEY` | Web search tool |
| `LANGSMITH_API_KEY`, `LANGSMITH_ENDPOINT`, `LANGSMITH_PROJECT`, `LANGSMITH_TRACING` | Tracing and feedback |
| `TUTOR_MODEL` | Model for tutoring, grading and essays |
| `BACKGROUND_MODEL` | Cheaper model for background work |
| `EMBEDDING_MODEL` | Embedding model (default `openai/text-embedding-3-small`); locked once documents are indexed |
| `DATABASE_URL` | Postgres connection (set by Compose by default) |

Never commit `.env`.

## Project layout (planned)

```
jimmy/
├── backend/            FastAPI app, graphs, tools, middleware, migrations, tests
├── frontend/           React app
├── eval/               golden set, Ragas run, report
├── data/seed/          demo data download target (not committed)
├── docs/
├── docker-compose.yml
├── .env.example
└── LICENSE
```

## Working on it

- **Pick the next issue** from the [issue list](https://github.com/cristimihailfilipgreenbay/jimmy/issues). Each issue is a vertical slice and names the issues it needs first.
- **Use the glossary.** Names in code, docs and the UI follow [docs/GLOSSARY.md](docs/GLOSSARY.md) (for example Study Space and Student, not "course" or "user").
- **Respect the ADRs** in [docs/adr/](docs/adr/). In particular, all chunk queries go through the one retrieval function that requires a Study Space id.
- **Migrations:** Alembic, reviewed by hand, never edit one that has been applied. See [docs/database.md](docs/database.md).
- **Tests:** unit tests for critical backend logic only, with a fake model; no integration or frontend tests. See [docs/architecture.md](docs/architecture.md), section 9.
- **Lint and format:** Ruff for Python. Frontend: Vite, TypeScript, Tailwind v4, shadcn, oxlint.

## Documentation

| Document | What it covers |
|---|---|
| [docs/overview.md](docs/overview.md) | What Jimmy is, who it is for, how it works |
| [docs/Features.md](docs/Features.md) | Feature list, mapped to issues |
| [docs/design.md](docs/design.md) | Product design: behaviour, screens, evaluation, risks |
| [docs/architecture.md](docs/architecture.md) | How it is built: stack, agent graphs, runtime, test seams |
| [docs/domain.md](docs/domain.md) | Concepts, relationships, invariants, lifecycles |
| [docs/api.md](docs/api.md) | HTTP contract: resources, streaming events, pauses and resume, errors |
| [docs/database.md](docs/database.md) | Postgres schema, constraints, indexes, migrations |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Vocabulary used everywhere |
| [docs/spec.md](docs/spec.md) | Requirements: user stories, implementation and testing decisions |
| [docs/adr/](docs/adr/) | Decision records |

## Licence

Apache License 2.0. See [LICENSE](LICENSE). Demo textbook content from OpenStax is used under its own open licence (CC BY-NC-SA 4.0) and is credited in the seed data's attribution file.
