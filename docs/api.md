# Jimmy: API

The HTTP contract between the frontend and the backend. Structure is in [architecture.md](./architecture.md), tables in [database.md](./database.md), vocabulary in [GLOSSARY.md](./GLOSSARY.md).

**Status:** draft. The resources and behaviour follow the agreed design. Exact paths, field names and error codes are proposals (marked *proposed*) until the first slice is built, and the OpenAPI schema FastAPI generates will become the source of truth once it exists.

## 1. Conventions

- **Base path:** `/api` (the dev proxy strips it, so the backend serves from the root; no version segment). JSON requests and responses, except file upload (multipart) and streaming (server-sent events).
- **Identity:** there is no login. The frontend's profile switcher sends the selected Student in the `X-Student-Id` header on every request. A request without it, or with an unknown id, gets `401`. *(proposed)*
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

`message` is written for the Student. `code` is stable for the frontend. *Proposed codes:* `unknown_student`, `space_not_found`, `file_too_large`, `too_many_pages`, `unsupported_type`, `scanned_document`, `guardrail_blocked`, `off_topic`, `step_limit_reached`, `tool_disabled`, `embedding_model_locked`, `nothing_to_resume`, `upstream_unavailable`.

## 2. Resources

### Health
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service and database status |

### Students and Profile
| Method | Path | Purpose |
|---|---|---|
| GET | `/students` | List profiles for the switcher (no `X-Student-Id` needed) |
| POST | `/students` | Create a profile |
| GET | `/profile` | The current Student's Profile (language, explanation style) |
| PATCH | `/profile` | Update language or explanation style |
| GET | `/profile/facts` | Stored facts and style preferences, with status |
| POST | `/profile/facts/{id}/approve` | Approve a proposed fact or style change |
| DELETE | `/profile/facts/{id}` | Delete a fact |

### Study Spaces
| Method | Path | Purpose |
|---|---|---|
| GET | `/spaces` | List Study Spaces with counts (documents, Topics, Weak Topics) |
| POST | `/spaces` | Create (`name`, `accent`) |
| GET | `/spaces/{space_id}` | One Space |
| PATCH | `/spaces/{space_id}` | Rename, change accent, toggle Subject Library |
| DELETE | `/spaces/{space_id}` | Delete and cascade to everything it owns (`204`). The confirmation is a frontend dialog; the endpoint is not callable without it from the UI. |

### Documents (Notes and library)
| Method | Path | Purpose |
|---|---|---|
| POST | `/spaces/{space_id}/documents` | Upload Notes (multipart). Returns `202` with the document and the ingestion `thread_id`. Rejects with `413`, `422 unsupported_type`, `422 too_many_pages` or `422 scanned_document` |
| GET | `/spaces/{space_id}/documents` | List with processing status |
| GET | `/spaces/{space_id}/documents/{id}` | One document |
| DELETE | `/spaces/{space_id}/documents/{id}` | Delete the document and its chunks |
| GET | `/libraries` | Available Subject Library packs (title, author, licence) |
| PUT | `/spaces/{space_id}/library` | Attach or detach a pack, or switch it on or off |

Document status values: `uploaded`, `extracting`, `rejected`, `awaiting_topic_review`, `embedding`, `ready`, `failed`.

### Topics
| Method | Path | Purpose |
|---|---|---|
| GET | `/spaces/{space_id}/topics` | List Topics |
| PATCH | `/spaces/{space_id}/topics/{id}` | Rename |
| POST | `/spaces/{space_id}/topics/merge` | Merge several Topics into one (`ids`, `name`) |

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
| POST | `/spaces/{space_id}/sessions` | Start a Quiz or Test (`kind`, `topic_ids`, `question_count`). Returns the session and its `thread_id` |
| GET | `/sessions/{session_id}` | State: current question, progress, results so far |
| POST | `/sessions/{session_id}/answers` | Submit an answer. Returns feedback (Quiz), an acknowledgement (Test), or a pending Dispute |
| GET | `/sessions/{session_id}/recap` | Final recap, with per-Topic breakdown for a Test |

A pending Dispute is answered through the thread resume endpoint.

### Weak Topics, Conflicts, Disputes
| Method | Path | Purpose |
|---|---|---|
| GET | `/spaces/{space_id}/weak-topics` | Current Weak Topics |
| DELETE | `/spaces/{space_id}/weak-topics/{topic_id}` | Clear one |
| GET | `/spaces/{space_id}/conflicts` | Stored Conflict decisions |
| DELETE | `/spaces/{space_id}/conflicts/{id}` | Forget a decision so it is asked again |
| GET | `/spaces/{space_id}/disputes` | Past Disputes |

### Flashcards
| Method | Path | Purpose |
|---|---|---|
| POST | `/spaces/{space_id}/flashcards/drafts` | Ask Jimmy to draft cards (`topic_ids`, `count`). Starts a run that pauses for review (section 4) |
| GET | `/spaces/{space_id}/flashcards` | Saved cards |
| DELETE | `/spaces/{space_id}/flashcards/{id}` | Delete a card |

### Learned Material
| Method | Path | Purpose |
|---|---|---|
| GET | `/spaces/{space_id}/learned-material` | List, filter by `status` (unreviewed or approved) |
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
| `token` | `text` | Streamed answer text |
| `tool_call` | `tool`, `status` (started, finished, failed), short description | "Searching your notes..." |
| `segment` | `source_type`, `citation_ids` | Marks which Source the text just streamed came from, so the UI can style it |
| `citation` | `id`, `source_type`, `document`, `author`, `page_or_section`, `passage` | Citation chips and the passage viewer |
| `interrupt` | `interrupt_id`, `kind`, `payload` | A pause the Student must answer (section 4) |
| `cost` | `tokens_in`, `tokens_out`, `usd` | Cost under the answer |
| `job` | `job_id`, `kind`, `status`, `message` | Background Promotion toast |
| `error` | `code`, `message` | A failure mid-stream |
| `done` | `message_id`, `trace_id` | End of the run; enables the 👍/👎 and the trace link |

The stream ends after `done`, `error`, or an `interrupt`. After an interrupt the client answers with resume and opens a new stream from the resume response.

## 4. Pauses and resume

A pause is a LangGraph interrupt saved to the checkpointer. The client learns about it from an `interrupt` event, or from `GET /threads/{thread_id}` if it reconnects later. It answers with:

```
POST /threads/{thread_id}/resume
{ "interrupt_id": "...", "decision": { ... } }
```

The response is an event stream that continues the run. Resuming an interrupt that was already answered or no longer exists returns `409 nothing_to_resume`.

| `kind` | Payload shown to the Student | `decision` |
|---|---|---|
| `conflict` | The Topic; the Notes passage and the other passage (Library, Learned Material or Tutor Knowledge), each with its Citation | `keep_notes`, `accept_other` or `unsure` |
| `dispute` | The question, the Student's answer, the Source passage, the automatic score and confidence | `correct` or `incorrect` |
| `flashcard_review` | Drafted cards with their Source passages | A list: for each card `approve`, `reject`, or `edit` with new front and back |
| `topic_review` | Proposed Topics for a document | A list: for each Topic `approve`, `rename` with a name, or `merge` into another |

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
