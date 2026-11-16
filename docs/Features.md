# Jimmy: Features

What Jimmy can do, grouped by area, with the issue that delivers each one. For the idea behind the product see [overview.md](./overview.md); for exact behaviour see [design.md](./design.md); for every requirement as a user story see [spec.md](./spec.md). Terms are defined in [GLOSSARY.md](./GLOSSARY.md).

## What makes it different from a chatbot

- **Your material first.** Answers cite your notes with document, author and page.
- **Honest about sources.** Notes, textbook, web and the tutor's own knowledge are labelled differently, so you always know how much to trust a statement.
- **It asks when it is unsure.** If your notes disagree with the textbook, or an answer is borderline, Jimmy pauses and lets you decide.
- **Per-subject progress.** Weak topics, flashcards and quiz history stay inside each Study Space.
- **It is an agent, not a pipeline.** It decides when to search your notes, the library, Wikipedia or the web, and whether a web finding is worth keeping.

## Features (v1)

Cited Q&A · Quizzes and Tests with weak-topic tracking · Flashcards with review · Conflict and Dispute handling · Web lookup with background saving · Developer screen with model settings, tool toggles and cost display · LangSmith tracing · an evaluation report. Essay questions come last.

## Feature list by area

| Area | Feature | Issue |
|---|---|---|
| **Study Spaces** | Create, list and delete a Study Space per subject, each isolated from the others | [#2](https://github.com/cristimihailfilipgreenbay/jimmy/issues/2) |
| **Notes** | Upload PDF, Markdown and text; scanned or oversized files are rejected with a clear message | [#3](https://github.com/cristimihailfilipgreenbay/jimmy/issues/3) |
| **Topics** | Topics extracted automatically, reviewed by the Student (approve, rename, merge) | [#5](https://github.com/cristimihailfilipgreenbay/jimmy/issues/5) |
| **Ask** | Streamed, cited answers from Notes; model knowledge clearly labelled | [#4](https://github.com/cristimihailfilipgreenbay/jimmy/issues/4) |
| **Subject Library** | Optional open-textbook chapters (OpenStax) per Space, switchable on and off | [#6](https://github.com/cristimihailfilipgreenbay/jimmy/issues/6) |
| **Web lookup** | The agent searches Wikipedia and the web when its sources fall short | [#7](https://github.com/cristimihailfilipgreenbay/jimmy/issues/7) |
| **Guardrails** | Input checks, injection scanning, off-topic redirect, loop protection | [#8](https://github.com/cristimihailfilipgreenbay/jimmy/issues/8) |
| **Growing knowledge** | Useful web Findings saved in the background as Learned Material, reviewed by the Student, kept out of assessments until approved | [#9](https://github.com/cristimihailfilipgreenbay/jimmy/issues/9) |
| **Conflicts** | Notes versus textbook disagreements flagged, never silently corrected; the Student decides and Jimmy remembers | [#10](https://github.com/cristimihailfilipgreenbay/jimmy/issues/10) |
| **Quiz** | Adaptive Quiz with feedback after each answer; Weak Topics weighted in and tracked | [#11](https://github.com/cristimihailfilipgreenbay/jimmy/issues/11) |
| **Disputes** | Borderline grades paused for the Student's decision | [#12](https://github.com/cristimihailfilipgreenbay/jimmy/issues/12) |
| **Flashcards** | Drafted from sources, approved or edited by the Student; edits teach card style | [#13](https://github.com/cristimihailfilipgreenbay/jimmy/issues/13) |
| **Test** | Longer assessment across Topics with results only at the end | [#14](https://github.com/cristimihailfilipgreenbay/jimmy/issues/14) |
| **Feedback and Profile** | 👍/👎 on answers; language and explanation style; approved style suggestions | [#15](https://github.com/cristimihailfilipgreenbay/jimmy/issues/15) |
| **Developer screen** | Model choice, temperature, tool toggles, token and cost display | [#16](https://github.com/cristimihailfilipgreenbay/jimmy/issues/16) |
| **Evaluation** | Ragas report plus custom checks for Citations, answer keys and Conflict detection | [#17](https://github.com/cristimihailfilipgreenbay/jimmy/issues/17) |
| **Essays** | Written-answer questions graded against a rubric (last story) | [#19](https://github.com/cristimihailfilipgreenbay/jimmy/issues/19) |

Everything runs from one `docker compose up -d`, with tracing in LangSmith. See the [README](../README.md) for getting started.

## Not in v1

Posting or publishing to any platform, image generation, analytics, real login, OCR for scanned documents, hybrid keyword-plus-vector search, spaced-repetition scheduling, and deployment beyond local Docker.
