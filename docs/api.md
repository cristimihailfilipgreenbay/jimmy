# Jimmy: API

The HTTP contract between the frontend and the backend. Structure is in [architecture.md](./architecture.md), tables in [database.md](./database.md), vocabulary in [GLOSSARY.md](./GLOSSARY.md).

**Status:** draft. The resources and behaviour follow the agreed design. Exact paths, field names and error codes are proposals (marked *proposed*) until the first slice is built, and the OpenAPI schema FastAPI generates will become the source of truth once it exists.

## 1. Conventions

- **Base path:** `/api` (the dev proxy strips it, so the backend serves from the root; no version segment). JSON requests and responses, except file upload (multipart) and streaming (server-sent events).
- **Identity:** a Student signs up or signs in with an email and a password. The backend answers with a signed JWT in an `httpOnly`, `SameSite=Lax` cookie (`jimmy_session`), which the browser sends on every request. A request without a valid session gets `401 unauthenticated`. Passwords are hashed with argon2. *(proposed)*
- **Ownership:** every resource a Student owns is checked against that header. A Study Space that belongs to another Student behaves as if it does not exist (`404`).
- **Study Space scoping:** everything that belongs to a Study Space is addressed under `/spaces/{space_id}/...`, so the isolation rule (ADR 0001) is visible in every route.
- **Identifiers:** UUIDs.
- **Timestamps:** ISO 8601, UTC.
- **Pagination:** list endpoints take `limit` (default 50, max 200) and an opaque `cursor`, and return `next_cursor`.
- **Status codes:** `200` read or update, `201` created, `202` accepted for background work, `204` deleted, `400` validation, `401` no Student, `404` not found, `409` conflict with current state, `413` file too large, `422` unprocessable, `429` guardrail or rate refusal, `502` upstream service failed.

### Error shape

```json
{ "error": { "code": "scanned_document", "message": "This PDF has no readable text...", "details": {} } }
```

`message` is written for the Student. `code` is stable for the frontend. *Proposed codes:* `unauthenticated`, `invalid_credentials`, `email_exists`, `already_onboarded`, `space_not_found`, `file_too_large`, `too_many_pages`, `unsupported_type`, `scanned_document`, `guardrail_blocked`, `off_topic`, `step_limit_reached`, `tool_disabled`, `embedding_model_locked`, `nothing_to_resume`, `upstream_unavailable`.

## 2. Resources

### Health
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service and database status |

### Authentication
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/sign-up` | Create an account (`email`, `password` of 8 to 128 characters) and sign in. `201`, sets the session cookie. `409 email_exists` for a taken email (compared ignoring case) |
| POST | `/auth/sign-in` | Sign in (`email`, `password`, `remember`, default true). `remember` false gives a 12-hour token and a cookie that ends with the browser session. `401 invalid_credentials` for a wrong email or password, the same answer for both |
| POST | `/auth/sign-out` | Clear the session cookie (`204`) |
| GET | `/auth/me` | The signed-in Student (`id`, `display_name`, `email`, `onboarded`). `display_name` is null and `onboarded` false until onboarding is finished |

### Onboarding
| Method | Path | Purpose |
|---|---|---|
| POST | `/onboarding` | Finish setting up the account, once. One transaction sets the Student's `name`, saves their `studies` (`course`, `university`, `year`) and `preferences` (`goals`, `explanation_style` of `short`, `balanced` or `detailed`, `web_search`) in the Profile, and creates the Study Spaces from `subjects` (`name`, optional `course`, `accent`; 1 to 20, names unique ignoring case). Returns `201` with the updated Student and the created Spaces. `409 already_onboarded` if it was done before, `409 space_exists` if a name is taken (nothing is saved), `400` for invalid input |

The app is closed to a Student who has not finished onboarding: the frontend sends them to `/welcome` whenever `onboarded` is false.

### Profile
| Method | Path | Purpose |
|---|---|---|
| GET | `/profile` | The current Student's Profile (language, explanation style) |
| PATCH | `/profile` | Update language or explanation style |
| GET | `/profile/facts` | Stored facts and style preferences, with status |
| POST | `/profile/facts/{id}/approve` | Approve a proposed fact or style change |
| DELETE | `/profile/facts/{id}` | Delete a fact |

### Study Spaces
| Method | Path | Purpose |
|---|---|---|
| GET | `/spaces` | List Study Spaces with counts (documents, Topics, Weak Topics), newest first |
| POST | `/spaces` | Create (`name`, optional `course`, `accent`). `accent` is one of `leaf-green`, `ink-blue`, `copper`, `rosewood`, `plum`, `teal`, `indigo`, `ochre`, `olive`, `slate` (default `slate`). `409 space_exists` for a name the Student already uses (ignoring case) |
| GET | `/spaces/{space_id}` | One Space |
| PATCH | `/spaces/{space_id}` | Change a Study Space. Only the fields that are sent change: `name` (rename, `409 space_exists` if another of the Student's Spaces has it, ignoring case), `course` (`null` or blank clears it) and `accent`. Returns the Space |
| DELETE | `/spaces/{space_id}` | Delete and cascade to everything it owns (`204`). The confirmation is a frontend dialog; the endpoint is not callable without it from the UI. |

### Documents (Notes and library)
| Method | Path | Purpose |
|---|---|---|
| POST | `/spaces/{space_id}/documents` | Upload Notes (multipart). Returns `202` with the document, which carries the ingestion `thread_id`. The run extracts Topics and then pauses for Topic review (section 4); the document is `awaiting_topic_review` until the Student answers. Rejects with `413`, `422 unsupported_type`, `422 too_many_pages` or `422 scanned_document` |
| GET | `/spaces/{space_id}/documents` | List with processing status. Notes by default; `?kind=library` lists the attached Subject Library chapters |
| GET | `/spaces/{space_id}/documents/{id}` | One document |
| DELETE | `/spaces/{space_id}/documents/{id}` | Delete the document and its chunks |
| GET | `/libraries` | Available Subject Library packs (title, author, licence), as registered by the seed command. `?q=` keeps only the packs matching those words (title, subject, author), best match first: Postgres full-text search on stemmed words, plus `pg_trgm` similarity so misspellings such as "fizics" still match |
| GET | `/spaces/{space_id}/library` | The Space's Subject Library: `enabled`, an overall `status` (`none`, `indexing`, `ready`, `failed`) and `books`, one per textbook on the shelf with its `pack`, `status`, `chapters_ready`, `chapters_total`, `chapters` (the book's chapter numbers) and `cited_in_answers` (answers in the Space with a Citation from that book) |
| PUT | `/spaces/{space_id}/library` | `{enabled}` switches the whole Library on or off; the chapters stay, but nothing in them is searched while it is off. `409 no_library` without a textbook. Returns the same shape as GET |
| PUT | `/spaces/{space_id}/library/packs/{pack_id}` | Add a textbook to the Space (a Space can hold several). Its chapters are indexed in the background; adding it again retries failed chapters. Switches the Library on. `404 pack_not_found`; `409 library_not_seeded` if the seed command has not downloaded it. Returns the same shape as GET |
| DELETE | `/spaces/{space_id}/library/packs/{pack_id}` | Remove a textbook and delete its chapters. The Library switches itself off when the last one goes. Returns the same shape as GET |

Document status values: `uploaded`, `extracting`, `rejected`, `awaiting_topic_review`, `embedding`, `ready`, `failed`.

### Topics
| Method | Path | Purpose |
|---|---|---|
| GET | `/spaces/{space_id}/topics` | List Topics (merged ones are left out) |
| PATCH | `/spaces/{space_id}/topics/{id}` | Rename. `409 topic_exists` if the Space has a Topic with that name (ignoring case) |
| DELETE | `/spaces/{space_id}/topics/{id}` | Delete a Topic (`204`), and any Topics merged into it. The confirmation is a frontend dialog |
| POST | `/spaces/{space_id}/topics/merge` | Merge several Topics into the first of `ids`, which takes `name`. `409 topic_exists` as above |

Topic review after an upload is not a plain edit; it is a pause in the ingestion run (section 4).

### Threads and chat
| Method | Path | Purpose |
|---|---|---|
| GET | `/spaces/{space_id}/threads` | List conversations |
| POST | `/spaces/{space_id}/threads` | Start a conversation |
| GET | `/threads/{thread_id}` | Metadata and any pending pause |
| GET | `/threads/{thread_id}/messages` | Message history with Citations, cost and trace id |
| POST | `/threads/{thread_id}/messages` | Send a message. Response is an event stream (section 3) |
| POST | `/threads/{thread_id}/cancel` | Stop a run in progress |
| POST | `/threads/{thread_id}/resume` | Answer a pause (section 4) |
| POST | `/messages/{message_id}/feedback` | `rating` up or down, optional `comment` |

### Study sessions
| Method | Path | Purpose |
|---|---|---|
| POST | `/spaces/{space_id}/sessions` | Start a Quiz (`kind`, `topic_ids` (none means every Topic), `question_count` 1 to 20). The first question is written before it returns. `409 no_topics` without approved Topics, `409 no_sources` when nothing can be asked about. Only `quiz` for now |
| GET | `/sessions/{session_id}` | State: current question, progress, results so far |
| POST | `/sessions/{session_id}/answers` | Submit an answer (`question_id`, `answer`: an option number for multiple choice, text for a short answer). A Quiz returns `{feedback, session}`: right or not, the correct answer, the explanation, the source passage, whether the Topic is now weak, and the next question inside `session.current`. A Test acknowledges (later). A written answer the grader is unsure of pauses the run as a Dispute: `feedback` is `null` and `session.dispute` holds the pause (`interrupt_id`, the question, the Student's answer, the reference answer, the automatic score and confidence, the Source passage). `session.thread_id` is the thread to resume. `409 question_not_current` for any question but the one waiting, `409 dispute_pending` while a Dispute waits; `422 invalid_answer` for a bad option |
| GET | `/sessions/{session_id}/recap` | Final recap, with per-Topic breakdown for a Test |

A pending Dispute is answered with `POST /threads/{session.thread_id}/resume` (`interrupt_id`, `decision`: `correct`, `incorrect` or `unsure`), which returns the same `{feedback, session}` as an answer, with `feedback.graded_by` `student` and `feedback.decision`. `GET /sessions/{id}` shows a pending Dispute again after a reload. `409 nothing_to_resume` for a Dispute that is not waiting, `422 invalid_decision` for any other word.

### Weak Topics, Conflicts, Disputes
| Method | Path | Purpose |
|---|---|---|
| GET | `/spaces/{space_id}/weak-topics` | Current Weak Topics |
| DELETE | `/spaces/{space_id}/weak-topics/{topic_id}` | Clear one |
| GET | `/spaces/{space_id}/conflicts` | Stored Conflict decisions, each with the two passages' documents and excerpts |
| DELETE | `/spaces/{space_id}/conflicts/{id}` | Forget a decision so it is asked again |
| GET | `/spaces/{space_id}/disputes` | Past Disputes, newest first: the Topic, question, the Student's answer, the automatic score and confidence, and the decision |

### Flashcards
| Method | Path | Purpose |
|---|---|---|
| POST | `/spaces/{space_id}/flashcards/drafts` | Ask Jimmy to draft cards (`topic_ids`, `count`). Starts a run that pauses for review (section 4) |
| GET | `/spaces/{space_id}/flashcards` | Saved cards |
| DELETE | `/spaces/{space_id}/flashcards/{id}` | Delete a card |

### Learned Material
| Method | Path | Purpose |
|---|---|---|
| GET | `/spaces/{space_id}/learned-material` | List, filter by `status` (unreviewed or approved). Each item has `title`, `publisher`, `url`, `excerpt`, `reason`, `fetched_at` and `used_in_answers` |
| POST | `/spaces/{space_id}/learned-material/{id}/approve` | Approve so it may feed assessments |
| DELETE | `/spaces/{space_id}/learned-material/{id}` | Delete it and its chunks |

### Settings, usage, events
| Method | Path | Purpose |
|---|---|---|
| GET | `/settings` | Models, temperature, max tokens, tool toggles, thresholds, locked embedding model |
| PUT | `/settings` | Update. Changing the embedding model after chunks exist fails with `409 embedding_model_locked` |
| GET | `/settings/models` | Models available through OpenRouter for the pickers |
| GET | `/usage` | Tokens and estimated cost, filterable by Space and date |
| GET | `/spaces/{space_id}/events` | Event stream for background work (Promotion toasts, ingestion progress) |

## 3. Streaming

`POST /threads/{thread_id}/messages` and `GET /spaces/{space_id}/events` return `text/event-stream`. Each event has a `type` and a JSON `data` payload.

| Event | Payload (summary) | Used for |
|---|---|---|
| `token` | `text` | Streamed answer text. A paragraph ends with Citation markers like `[1]`, or starts with `[tutor]` for Tutor Knowledge |
| `reset` | none | The Citation check rejected the answer being streamed; discard the text, a rewrite follows |
| `tool_call` | `tool`, `status` (started, finished, failed), short description, `found` (passages returned, on finished) | "Searching your notes..." |
| `segment` | `source_type`, `citation_ids` | Marks which Source the text just streamed came from, so the UI can style it |
| `citation` | `id`, `source_type` (`notes`, `library`, `learned`, `wikipedia`, `web`), `document`, `author`, `page_or_section`, `passage`, and for a web Finding `url` and `fetched_at` | Citation chips and the passage viewer |
| `interrupt` | `interrupt_id`, `kind`, `payload` | A pause the Student must answer (section 4) |
| `cost` | `tokens_in`, `tokens_out`, `usd` | Cost under the answer |
| `job` | `job_id`, `kind`, `status`, `message`, `outcome` (`saved`, `kept`, `refused` or `failed` for a Promotion) | Background Promotion toast; sent on `GET /spaces/{space_id}/events` only for work that finishes while the stream is open |
| `error` | `code`, `message` | A failure mid-stream |
| `done` | `message_id`, `trace_id`, `content` (the stored answer, which can differ from the streamed text if the backend had to label a paragraph) | End of the run; enables the 👍/👎 and the trace link |

The stream ends after `done`, `error`, or an `interrupt`. After an interrupt the client answers with resume and opens a new stream from the resume response.

## 4. Pauses and resume

A pause is a LangGraph interrupt saved to the checkpointer. The client learns about it from an `interrupt` event, or from `GET /threads/{thread_id}` if it reconnects later. It answers with:

```
POST /threads/{thread_id}/resume
{ "interrupt_id": "...", "decision": { ... } }
```

The route answers every kind of pause and looks at the thread's kind: a chat thread continues the paused question; an ingestion thread takes the Topic review. A `conflict` decision is one word (`keep_notes`, `accept_other`, `unsure`); anything else returns `422 invalid_decision`. The pause belongs to the thread's latest question, so asking something new abandons it.

The response is an event stream that continues the run, except for `topic_review`: indexing is a background job, so that answer returns `202` with the document and the Student follows its `status`. Resuming an interrupt that was already answered or no longer exists returns `409 nothing_to_resume`.

| `kind` | Payload shown to the Student | `decision` |
|---|---|---|
| `conflict` | The Topic; the Notes passage and the other passage (Library, Learned Material or Tutor Knowledge), each with its Citation | `keep_notes`, `accept_other` or `unsure` |
| `dispute` | The question, the Student's answer, the Source passage, the automatic score and confidence | `correct`, `incorrect` or `unsure` (not right, so the Topic is reviewed) |
| `flashcard_review` | Drafted cards with their Source passages | A list: for each card `approve`, `reject`, or `edit` with new front and back |
| `topic_review` | `document_id`, `proposed` (each with `id`, `name` and `existing_id`, set when the Space already has a Topic of that name) and `existing` (the Space's Topics) | A list with one entry per Topic: `{id, action}` where `action` is `approve`, `rename` (with `name`), `merge` (with `into`: the id of another proposed Topic or of an existing one) or `remove`. A Topic with no entry is approved. A review that makes no sense returns `422 invalid_topic_review` and the run stays paused |

Deleting Notes or a Study Space, approving Learned Material and approving a Profile change are plain requests with a frontend confirmation, not interrupts.

## 5. Behaviour the API guarantees

- **Isolation:** no response contains data from a Study Space other than the one in the path. A resource id from another Space returns `404`.
- **Citations:** every assistant message either carries Citations for its Notes, Library and Learned Material statements, or labels those statements as Tutor Knowledge. The backend rejects its own answer and retries if neither holds.
- **Assessments:** questions, answer keys and drafted Flashcards come only from Notes, Subject Library and approved Learned Material.
- **Guardrails:** a message the guardrail blocks returns `429 guardrail_blocked`; an off-topic message gets a normal friendly assistant reply, not an error.
- **Limits:** uploads over 20 MB return `413`; over 200 pages return `422 too_many_pages`. A run stops after eight agent steps or three identical tool calls and ends with `error: step_limit_reached`.
- **Tool toggles:** a disabled tool is not offered to the agent; asking for it directly returns `409 tool_disabled`.
- **Background work:** Promotion never blocks a response. It is reported afterwards through `job` events and is visible in Learned Material.
- **Upstream failures:** OpenRouter, Tavily, Wikipedia or LangSmith failing returns `502 upstream_unavailable` where the request cannot proceed. A failed search tool inside an agent run does not fail the whole run; the agent is told the tool failed and carries on.

## 6. Open items

- Whether profile creation needs any validation beyond a unique display name.
- Whether the event stream for a Space should be one long-lived connection or opened per page.
- Cancellation semantics for a run paused at an interrupt: discard the checkpoint, or keep it so the Student can resume later.
