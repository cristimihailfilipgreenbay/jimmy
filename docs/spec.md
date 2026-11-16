# Jimmy: Spec (v1)

Vocabulary follows [GLOSSARY.md](./GLOSSARY.md). Product behaviour is in [design.md](./design.md), structure in [architecture.md](./architecture.md), rules and lifecycles in [domain.md](./domain.md). Decisions in [adr/](./adr/) are binding.

## Problem Statement

A university student studies from their own lecture notes and PDFs. A general chatbot has not read those notes, mixes in knowledge it cannot cite, sounds equally confident when it is wrong, and forgets what the student struggles with. Studying several subjects makes it worse: material, progress and questions blur together. The student cannot tell which statements come from their course and which the model made up, and has no way to be quizzed on their own material with answers they can trust.

## Solution

Jimmy is a study tutor organised around **Study Spaces**, one per subject. The student uploads Notes, optionally attaches an open-textbook Subject Library, and chats with a tutor that answers from those Sources first, from the web when they fall short, and from its own Tutor Knowledge for explanations, labelling each statement by origin and citing the document, author and page. It quizzes the student, tests them, makes flashcards, and remembers Weak Topics per subject. When it is unsure, it pauses and asks the student to decide: when Notes contradict the textbook, when a grade is borderline, and before saving anything. When its sources are not enough, it looks things up and decides by itself whether to keep the result, saving it in the background without making the student wait, and keeping it out of assessments until the student approves it.

## User Stories

### Study Spaces and Profile
1. As a Student, I want to create a Study Space for each subject, so that Biology and Physics never mix.
2. As a Student, I want to see all my Study Spaces with a short summary (notes count, Weak Topics), so that I know where to start.
3. As a Student, I want each Study Space to have its own accent colour, so that I always know which subject I am in.
4. As a Student, I want to delete a Study Space after a confirmation, so that I can remove a subject completely.
5. As a Student, I want deleting a Study Space to remove all its Notes, Topics, Flashcards, Learned Material and history, so that nothing is left behind.
6. As a Student, I want to switch between profiles, so that more than one person can use the same installation.
7. As a Student, I want to set my language in my Profile, so that answers come in the language I study in.
8. As a Student, I want to set my preferred explanation style once, so that it applies in every Study Space.

### Notes and ingestion
9. As a Student, I want to upload PDF, Markdown and plain-text Notes, so that Jimmy can use my course material.
10. As a Student, I want a clear message when my PDF is scanned and unreadable, so that I know to provide a text version.
11. As a Student, I want to be told when a file is over the size or page limit, so that I understand why it was rejected.
12. As a Student, I want to see the processing status of each document, so that I know when I can ask about it.
13. As a Student, I want Notes in other languages to work, so that I can study in the language of my course.
14. As a Student, I want to delete a document after a confirmation, so that I can remove the wrong file.
15. As a Student, I want Topics extracted automatically from my Notes, so that I do not have to define them myself.
16. As a Student, I want to approve, rename or merge the proposed Topics before they are used, so that my progress tracking is accurate.
17. As a Student, I want to see the list of Topics for a Study Space, so that I know what the tutor thinks the subject covers.

### Subject Library
18. As a Student, I want to switch an open-textbook Subject Library on or off for a Study Space, so that I can use it when my Notes are thin.
19. As a Student, I want the demo Study Spaces for Biology and Physics to come with library chapters, so that I can try Jimmy without uploading anything.
20. As a Student, I want the library's licence and authors to be credited, so that I know where the material comes from.

### Asking questions
21. As a Student, I want to ask a question about my Notes and get a streamed answer, so that I do not wait for the whole response.
22. As a Student, I want every statement from my Notes or the library to carry a Citation with document, author and page, so that I can check it.
23. As a Student, I want to open a Citation and read the source passage, so that I can verify the claim.
24. As a Student, I want statements from the model's own knowledge labelled "general knowledge, not from your notes", so that I know what I cannot check.
25. As a Student, I want the four source types to look different in more than colour, so that I can tell them apart at a glance.
26. As a Student, I want to see which tool the tutor is using while it works ("Searching your notes...", "Searching Wikipedia..."), so that waiting does not feel like a black box.
27. As a Student, I want the tutor to explain concepts with analogies and examples, so that I understand rather than just read.
28. As a Student, I want questions unrelated to my Study Space to get a polite redirect, so that the tutor stays on subject.
29. As a Student, I want to stop a response that is going the wrong way, so that I do not wait for it to finish.
30. As a Student, I want to continue a conversation later, so that I can pick up where I left off.
31. As a Student, I want a long conversation not to lose its thread, so that the tutor still remembers what we discussed.

### Lookup beyond my sources
32. As a Student, I want the tutor to look things up on Wikipedia or the web when my Notes and the library are not enough, so that I still get an answer.
33. As a Student, I want those answers cited and labelled as web-sourced, so that I know how far to trust them.
34. As a Student, I want the tutor to decide for itself whether to look further, so that simple questions are not slowed down.
35. As a Student, I want useful web findings saved into my Study Space in the background, so that the knowledge base grows without me waiting.
36. As a Student, I want a notification when something is saved, so that I know the Space has changed.
37. As a Student, I want a list of everything the tutor saved from the web, so that I can review it.
38. As a Student, I want to approve or delete each saved item, so that I stay in control of what my Space knows.
39. As a Student, I want saved web material kept out of quizzes, tests and flashcards until I approve it, so that a wrong answer key never reaches me.
40. As a Student, I want temporary web findings to stay only in the current conversation, so that one-off facts do not clutter my Space.
41. As a Student, I want text from a poisoned web page refused, so that a malicious page cannot change how the tutor behaves.

### Conflicts
42. As a Student, I want the tutor to tell me when my Notes disagree with the textbook or its own knowledge, so that I can catch mistakes in my notes.
43. As a Student, I want to see both versions side by side with their sources, so that I can judge.
44. As a Student, I want to choose to keep my Notes, accept the other source, or mark it as unsure, so that the decision is mine.
45. As a Student, I want my decision remembered for that Topic, so that I am not asked again every time.
46. As a Student, I want the tutor never to silently correct me, so that I trust what it says.

### Quizzes, tests and grading
47. As a Student, I want to start a Quiz on chosen Topics, so that I can practise.
48. As a Student, I want a Quiz to weight my Weak Topics, so that I practise what I find hardest.
49. As a Student, I want multiple-choice and short written-answer questions, so that I am tested in different ways.
50. As a Student, I want feedback and an explanation after each Quiz question, so that I learn straight away.
51. As a Student, I want to see the source passage with each answer, so that I can check the answer key.
52. As a Student, I want question difficulty to adapt to how I am doing, so that I am challenged without being overwhelmed.
53. As a Student, I want a recap at the end of a session, so that I know what to review.
54. As a Student, I want to take a longer Test across several Topics with results only at the end, so that I can simulate an exam.
55. As a Student, I want a per-Topic breakdown of my Test, so that I see where I lost points.
56. As a Student, I want a Topic to become weak when I keep getting it wrong, and stop being weak when I get it right again, so that the list reflects my current state.
57. As a Student, I want to see and clear my Weak Topics, so that I can correct the tutor.
58. As a Student, I want to be asked to decide when a short answer is borderline, so that an unfair grade does not mark a Topic as weak.
59. As a Student, I want to see my answer beside the source passage when I dispute a grade, so that I can judge it myself.
60. As a Student, I want my decision on a Dispute to override the automatic grade, so that the record is correct.
61. As a Student, I want to write an essay and receive rubric-based feedback with citations, so that I can practise longer answers. *(last story)*

### Flashcards
62. As a Student, I want Flashcards drafted from my Notes and the library, so that I do not write them by hand.
63. As a Student, I want to approve, edit or reject each drafted card, so that only good cards are saved.
64. As a Student, I want my edits to teach the tutor my preferred card style, so that later drafts need less fixing.
65. As a Student, I want to flip through my saved Flashcards, so that I can revise.

### Feedback, cost and settings
66. As a Student, I want to rate an answer with a thumbs up or down, so that I can tell Jimmy what works.
67. As a Student, I want repeated feedback to propose a style change that I approve, so that Jimmy adapts without changing silently.
68. As a Student, I want to see how many tokens and what estimated cost each answer used, so that I understand the cost of using it.
69. As a Developer, I want a settings screen separate from the student's screens, so that model settings do not confuse students.
70. As a Developer, I want to choose the tutor and background models and set temperature and maximum tokens, so that I can tune quality and cost.
71. As a Developer, I want to switch each tool on or off, so that I can see how the agent behaves without it.
72. As a Developer, I want the embedding model locked once documents are indexed, so that vectors stay consistent.
73. As a Developer, I want each run traced in LangSmith and linked from the answer, so that I can inspect the agent's steps.

### Safety and robustness
74. As a Student, I want my messages checked by a guardrail before reaching the tutor, so that misuse is blocked.
75. As a Student, I want instructions hidden inside my Notes to be ignored, so that a bad document cannot take over the tutor.
76. As a Developer, I want the agent to stop after a fixed number of steps or repeated identical tool calls, so that a bug cannot run up cost.
77. As a Student, I want clear, friendly errors when a lookup service is down, so that I can still use the rest of the app.
78. As a Student, I want one Study Space to be unable to read another's data, so that my subjects stay separate.

### Evaluation and delivery
79. As a Reviewer, I want an evaluation report with faithfulness, context precision and recall, so that I can judge answer quality.
80. As a Reviewer, I want custom checks for Citation correctness, answer-key correctness and Conflict detection, so that the features that matter are measured.
81. As a Reviewer, I want to start the whole app with one command and a `.env` file, so that I can run it easily.
82. As a Reviewer, I want seeded Biology and Physics Study Spaces, so that I can follow a demo straight away.

## Implementation Decisions

**Structure and scope**
- A Study Space is the unit of scope and isolation. Each owns its Notes, Topics, Weak Topics, Flashcards, Learned Material, Conflict decisions, Dispute records and history. One Profile is shared across a Student's Spaces.
- A Student signs up and signs in with an email and a password, and every Student-owned row carries that identity. The session is a signed JWT in an httpOnly cookie. Password reset by email is out of scope because the app is local and sends no email.
- The app is local only and runs as three services (database, backend, frontend) from one compose file and one environment file. The backend applies database migrations on start; demo data is loaded by a separate seed command. *(The migration and seed behaviour was assumed, not decided.)*

**Agents**
- Three LangGraph pieces: the Tutor chat (a free-form ReAct agent with middleware), the Study Session (an explicit graph for Quiz and Test with conditional edges), and Ingestion (an explicit graph with a Topic-review pause).
- The Tutor decides sufficiency itself, trying Notes, then Library, then Wikipedia, then Tavily. No fixed pipeline orders these steps.
- Tools, each switchable: search Notes, search Library, search Wikipedia, search the web, compare sources, promote a Finding, record a quiz result, save Flashcards.
- Compare sources asks a cheap model to classify two passages as agree, contradict or unrelated; the Tutor calls it only when it judges the sources may disagree.
- Promotion is a structured decision (save or keep in conversation, with a reason) made by the Tutor. It saves only if the Finding is relevant to the Space, reputable, stable, not a duplicate and free of injection. Saving runs as a background task, so the Student never waits.
- Middleware: input guard, data-not-instructions handling for retrieved text, an eight-step cap with a stop on three identical tool calls, a Citation check on every answer, tool policy and logging, and summarisation of long conversations.

**Human-in-the-loop**
- Every pause is a LangGraph interrupt saved to the checkpointer. The backend streams over server-sent events with typed events (token, tool call, citation, cost, interrupt, done). The frontend resumes a paused run with a dedicated resume request.
- Core pauses: Conflict resolution, Disputed grading, Flashcard review with edits. Extras: Topic review, delete confirmation, Learned Material review, Profile change approval. Weak Topics update automatically.

**Knowledge and data**
- One Postgres with pgvector holds app data, vectors and LangGraph checkpoints. Chunks carry a mandatory Study Space identity and a source type (notes, library, learned), document title, author, page or section, Topic, and the embedding model and dimensions. See ADR 0001.
- Exactly one retrieval function queries chunks, and it requires the Study Space identity.
- Embeddings come from OpenRouter (default OpenAI small embeddings), and the embedding model is locked once chunks exist.
- Learned Material never feeds assessments until approved. See ADR 0002.
- Page-aware chunking; vector search only in v1.

**Rules**
- Weak Topic: weak after two wrong answers in the last five; not weak after three correct in a row.
- Grading returns a score and a confidence. A Dispute is raised when confidence is under 0.7 or the score is within 0.15 of the pass line; both thresholds are settings.
- Uploads: PDF, Markdown, plain text; 20 MB; 200 pages; no OCR; scanned documents are rejected with a message.
- Questions unrelated to the Study Space get a gentle redirect.
- UI in English; answers follow the Profile language.

**Models and cost**
- A stronger model for tutoring, essays and grading; a cheaper model for background work (Topic extraction, Promotion decisions, classification). Both are set by environment variables and overridable in the Developer screen. The embedding model is not overridable once chunks exist.
- Tokens and estimated cost are calculated and shown per answer.

**Guardrails**
- NeMo Guardrails with a multilingual Nemotron safety model checks Student input; Llama Prompt Guard 2 scans retrieved and web text before Promotion. An early spike confirms the Nemotron model is reachable; if not, Prompt Guard 2 covers both.

**Observability and feedback**
- LangSmith traces every run. Thumbs up or down is stored with the trace identity and sent to LangSmith. Repeated feedback may propose a Profile style change that needs Approval.

**Interface contracts**
- The backend exposes resources for Study Spaces, documents, Topics, threads (create, stream, resume), study sessions, Flashcards, Learned Material, Weak Topics, Profile facts, feedback, settings and usage. Everything that belongs to a Study Space is addressed through it.

## Testing Decisions

- **What a good test does:** it checks external behaviour of a module (what goes in, what comes out, what it refuses) and does not depend on how the module is built inside. It uses a fake model, so it is fast and repeatable.
- **Scope, as decided:** unit tests for critical backend logic only. No integration tests, no frontend tests, and no real-model smoke tests (those are checked manually). Evaluation scripts run separately from the tests.
- **Modules to test (each is a seam):**
  - the retrieval function, checking that it refuses to run without a Study Space identity and always builds its query with it (a query-construction check, since a database test would be integration);
  - the Weak Topic rule;
  - the Promotion gate;
  - the Citation check;
  - cost calculation;
  - chunking and citation metadata;
  - grading and Dispute routing.
- **Prior art:** none yet; this is a new codebase. The first tests set the pattern.

## Out of Scope

Posting or publishing to any platform, image generation, analytics, password reset by email, OCR for scanned documents, hybrid (keyword plus vector) search, spaced-repetition scheduling, any deployment beyond local Docker, sharing a Study Space between Students, and a mobile app.

## Further Notes

- **Essay questions** are deliberately the last story and are not required for the first usable release.
- **Open domain questions** (Topic merging, deleting a Space with a pending save, the duplicate-Finding threshold, and Conflict decisions after new Notes) are listed with proposed defaults in [domain.md](./domain.md) and need a decision during implementation.
- **Test seams to confirm.** The ideal is one high seam, but the agreed rule of unit tests for critical logic only leads to the seven listed above. The highest practical seam would be the backend's public interface with a fake model, which would count as integration testing and was ruled out.
- **Issue tracker.** This spec has not been published to an issue tracker. No tracker or triage vocabulary is configured; run `/setup-matt-pocock-skills`, then publish this spec with the `ready-for-agent` label.
- **Build order** is in the [GitHub issues](https://github.com/cristimihailfilipgreenbay/jimmy/issues) (#1 to #19). Each is a vertical slice, and each lists the issues it needs.
- **Visual reference:** [Jimmy: Study Tutor Prototype](https://claude.ai/artifact/TSNW2vrvQXEA6QRmi1WLDt).
