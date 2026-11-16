# Jimmy: Backlog

Each issue is a vertical slice: it touches backend, data and UI as needed and ends in something demoable. Order matters; "Needs" lists the issues that must be done first. Essay is deliberately last.

| # | Issue | Needs |
|---|---|---|
| 1 | Walking skeleton | none |
| 2 | Create and delete Study Spaces | 1 |
| 3 | Upload Notes and index them | 2 |
| 4 | Cited answers from Notes | 3 |
| 5 | Topics extracted with review | 3 |
| 6 | Subject Library with demo data | 4 |
| 7 | Lookup fallback to Wikipedia and Tavily | 4 |
| 8 | Guardrails | 4 |
| 9 | Promotion and Learned Material | 7, 8 |
| 10 | Conflict resolution | 6 |
| 11 | Quiz with Weak Topics | 5 |
| 12 | Disputed grading | 11 |
| 13 | Flashcards with review and edits | 11 |
| 14 | Test mode | 11 |
| 15 | Feedback and Profile | 4 |
| 16 | Developer screen, tool toggles, cost display | 4 |
| 17 | Evaluation report | 6, 7, 10 |
| 18 | Documentation and demo polish | all above |
| 19 | Essay questions | 12, 14 |

---

## 1. Walking skeleton
`docker compose up` with one `.env` starts `db` (pgvector), `backend` and `frontend`. The backend runs Alembic migrations on start, exposes `/health`, and traces a trivial LangGraph call to LangSmith. The frontend shows a React Router shell with the planned routes.
**Done when:** a fresh clone plus `.env` plus `docker compose up` shows the app, a healthy API and a trace in LangSmith.

## 2. Create and delete Study Spaces
Profile switcher sets `student_id`. A Student creates, lists and deletes Spaces. Deleting asks for Approval and cascades.
**Done when:** two Spaces exist for one Student and deleting one removes everything it owns.

## 3. Upload Notes and index them
Ingestion graph: extract text (reject scanned PDFs with a clear message), page-aware chunking with title, author and page metadata, embeddings through OpenRouter, stored with `space_id`. Enforce 20 MB and 200 pages. Single retrieval function requiring `space_id`, with unit tests (ADR 0001).
**Done when:** a PDF uploaded to Biology is searchable only from Biology, and a scanned PDF is rejected politely.

## 4. Cited answers from Notes
Tutor chat with `create_agent`, `search_notes`, SSE streaming, Citation rendering, Tutor Knowledge label, Citation-check middleware (unit-tested), iteration cap.
**Done when:** the Student asks a question about their Notes and gets a streamed answer with page-level Citations, and a general question gets a labelled Tutor Knowledge answer.

## 5. Topics extracted with review
Ingestion extracts Topics and pauses for the Student to approve, rename or merge them before they are used.
**Done when:** a Student edits the proposed Topic list and the final list is saved against the Space.

## 6. Subject Library with demo data
Seed script downloads OpenStax chapters for Biology and Physics with `ATTRIBUTION.md`. `search_library` tool; per-Space switch to enable the Library.
**Done when:** a question not covered by Notes is answered from OpenStax with an author and page Citation.

## 7. Lookup fallback to Wikipedia and Tavily
`search_wikipedia` and `search_web` tools. The agent decides sufficiency itself. Findings are kept in conversation state only.
**Done when:** a question outside Notes and Library gets a cited answer from the web, with the Finding visible in the conversation.

## 8. Guardrails
Spike: NeMo Guardrails with the multilingual Nemotron safety model on student input; fall back to Prompt Guard 2 if the model is not freely reachable. Prompt Guard 2 scanning for retrieved and web text. Scope guard for off-topic questions. Doom-loop stop.
**Done when:** a known injection string in a Note or web result is flagged, an off-topic question is redirected, and the spike result is recorded.

## 9. Promotion and Learned Material
Agent returns a structured promotion decision. Saving runs as a background task with a toast. Review list on the Space dashboard. Learned Material is excluded from assessments until approved (ADR 0002). Promotion gate unit-tested.
**Done when:** after a web answer the Finding appears in Learned Material without blocking the chat, labelled "web-sourced, unreviewed", and an injected passage is refused.

## 10. Conflict resolution
`compare_sources` tool. On a contradiction the run pauses, the Student chooses, and the decision is stored per Topic and used in later answers.
**Done when:** a Note with a planted wrong statement triggers a pause, and the Student's choice is remembered in a new chat.

## 11. Quiz with Weak Topics
Study Session graph for multiple-choice and short-answer questions from Notes and Library, feedback after each answer, adaptive difficulty, recap. `record_quiz_result` updates Weak Topics with the 2-of-5 and 3-in-a-row rule (unit-tested), shown and clearable.
**Done when:** wrong answers make a Topic weak, weak Topics appear more often in the next Quiz, and answers show their source passage.

## 12. Disputed grading
Grader returns score and confidence. Below 0.7 confidence or within 0.15 of the pass line, the run pauses and shows the Student's answer beside the source. Routing unit-tested.
**Done when:** a borderline answer triggers a Dispute and the Student's decision overrides the grade and the Weak Topic record.

## 13. Flashcards with review and edits
`save_flashcards` drafts cards from Notes and Library. The Student approves, edits or rejects each. Edits are recorded as style preferences.
**Done when:** approved cards appear on the Flashcards screen and edits change the style of the next batch after Approval.

## 14. Test mode
A longer assessment across several Topics, with results and explanations only at the end.
**Done when:** a Student completes a 10-question Test and sees the score and per-Topic breakdown at the end.

## 15. Feedback and Profile
👍/👎 stored with the LangSmith trace ID and sent as LangSmith feedback. Profile holds language and explanation style. Repeated feedback proposes a style change that needs Approval.
**Done when:** a rating shows up in LangSmith and the next answer reflects an approved Profile change.

## 16. Developer screen, tool toggles, cost display
Settings and Developer screen: model choice, temperature, max tokens, per-tool toggles, locked embedding model. Tokens and estimated cost per answer (cost calculation unit-tested).
**Done when:** disabling `search_web` stops the agent using it, and each answer shows its cost.

## 17. Evaluation report
Golden set of about 20 questions, Ragas (faithfulness, context precision and recall), Citation correctness, answer-key correctness by LLM judge, and Conflict detection on planted errors. Report saved to `eval/report.md`.
**Done when:** the report runs from one command and shows a score for each metric.

## 18. Documentation and demo polish
README with usage and examples, design decisions, known limits and improvement ideas. Demo script using the seeded Biology and Physics Spaces.
**Done when:** a reviewer can run the app and follow the demo from the README alone.

## 19. Essay questions
Essay question type graded against a rubric derived from the Sources, with Dispute support.
**Done when:** a Student writes an essay, receives rubric-based feedback with Citations, and can Dispute the grade.
