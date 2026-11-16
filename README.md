# Jimmy

An AI study tutor for university students. Jimmy works inside one **Study Space** per subject (Biology, Physics, ...) and answers from the student's own notes, an optional open-textbook library, and its own subject knowledge, always showing which. It quizzes you, remembers which topics you struggle with, and when its sources fall short it looks things up on Wikipedia or the web and grows the knowledge base in the background.

> **Status:** design phase. The documentation is complete; the application is not built yet. The build is tracked in [GitHub issues](https://github.com/cristimihailfilipgreenbay/jimmy/issues), in order, starting with #1.

## What makes it different from a chatbot

- **Your material first.** Answers cite your notes with document, author and page.
- **Honest about sources.** Notes, textbook, web and the tutor's own knowledge are labelled differently, so you always know how much to trust a statement.
- **It asks when it is unsure.** If your notes disagree with the textbook, or an answer is borderline, Jimmy pauses and lets you decide.
- **Per-subject progress.** Weak topics, flashcards and quiz history stay inside each Study Space.
- **It is an agent, not a pipeline.** It decides when to search your notes, the library, Wikipedia or the web, and whether a web finding is worth keeping.

## Features (v1)

Cited Q&A · Quizzes and Tests with weak-topic tracking · Flashcards with review · Conflict and Dispute handling · Web lookup with background saving · Developer screen with model settings, tool toggles and cost display · LangSmith tracing · an evaluation report. Essay questions come last.

## Stack

Python, FastAPI, LangGraph, LangSmith, OpenRouter, Postgres with pgvector, React, React Router, shadcn. Runs locally with Docker Compose.

## Running it (once built)

```bash
cp .env.example .env     # add your OpenRouter, Tavily and LangSmith keys
docker compose up
```

This starts the database, the backend and the frontend. Demo data (open-licensed OpenStax chapters) is loaded with a separate seed command.

## Documentation

| Document | What it covers |
|---|---|
| [docs/design.md](docs/design.md) | Product design: purpose, behaviour, screens, evaluation, risks |
| [docs/architecture.md](docs/architecture.md) | How it is built: stack, agent graphs, runtime, data, test seams |
| [docs/domain.md](docs/domain.md) | Concepts, relationships, invariants, lifecycles |
| [docs/api.md](docs/api.md) | HTTP contract: resources, streaming events, pauses and resume, errors |
| [docs/database.md](docs/database.md) | Postgres schema, constraints, indexes, migrations |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Vocabulary used everywhere |
| [docs/spec.md](docs/spec.md) | Requirements: user stories, implementation and testing decisions |
| [docs/adr/](docs/adr/) | Decision records |

## Licence

Apache License 2.0. See [LICENSE](LICENSE). Demo textbook content from OpenStax is used under its own CC BY licence and is credited in the seed data's attribution file.
