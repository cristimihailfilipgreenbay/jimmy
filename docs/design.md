# Jimmy: Product Design

What Jimmy does and why. How it is built is in [architecture.md](./architecture.md); the concepts and rules are in [domain.md](./domain.md); vocabulary is in [GLOSSARY.md](./GLOSSARY.md). Hard-to-reverse decisions are in [adr/](./adr/).

## 1. Purpose

**Problem.** Students study from their own lecture notes. A general chatbot has not read those notes, mixes in unverifiable knowledge, and does not remember what the student struggles with.

**Solution.** Jimmy is a tutor agent that works inside one **Study Space** per subject. It answers from the student's **Notes**, an optional open-textbook **Subject Library**, and its own **Tutor Knowledge**, and always says which. It quizzes the student, tracks **Weak Topics**, and grows the Space with web **Findings** when its sources fall short.

**Target user.** University students studying from their own notes and PDFs.

**Why it is an agent, not a pipeline.** The agent decides at each step: are the Notes sufficient, should it query the Library, Wikipedia or Tavily, is there a Conflict, should a Finding be promoted. The developer does not fix that order.

**Why not just ChatGPT.** It answers from the student's own material with Citations, keeps per-subject progress, flags Conflicts instead of silently choosing, pauses for the student's decision when unsure, and is measured with an evaluation report.

## 2. Lookup policy and Promotion

The ReAct agent tries Notes, then the Subject Library, then Wikipedia, then Tavily, and judges for itself whether what it has is sufficient. An `after_model` check requires every answer to carry Citations or a Tutor Knowledge label. Citation format: document or book, author, page or section (e.g. "Biology 2e, OpenStax, ch. 8, p. 215").

When Notes and Library might disagree, the agent calls `compare_sources` (cheap model: agree, contradict, unrelated). On a contradiction it pauses and the student chooses. The choice is stored for that Topic and shapes later answers. Conflicts are flagged, never silently corrected.

After answering from a Finding, the agent returns a structured decision: save permanently or conversation only, with a reason. It saves only if the Finding is relevant to the Space, from Wikipedia or a reputable source, stable rather than time-sensitive, not a duplicate, and free of injection. Saving runs in the background and the UI shows a toast. Saved items appear in a review list, and until approved they never feed assessments (ADR 0002).

## 3. Study modes

- **Ask:** cited Q&A in the chat.
- **Quiz:** short, interactive, feedback after every answer. Multiple choice and short written answers.
- **Test:** longer, across Topics, results and explanations only at the end.
- **Flashcards:** drafted from Notes and Library, reviewed by the student. **Known limitation:** in the deck viewer, Again and Hard turn the card back to its front and Got it moves to the next card. Ratings are not stored and do not schedule reviews (the prototype implies spaced repetition: again in 1 minute, hard in 10, got it in 3 days). Adding it needs a stored rating and a due time per card, and a Study deck that shows due cards first.
- **Essay:** graded against a rubric derived from the Sources. This is the last story.

Weak Topics are weighted into Quiz and Test selection. Questions, answers and flashcards use only Notes, the Subject Library and approved Learned Material.

## 4. Human-in-the-loop moments

| Moment | Why it pauses | Kind |
|---|---|---|
| Conflict resolution | Agent is uncertain which source is right | Core |
| Disputed grading | Grader is uncertain | Core |
| Flashcard review with edits | Student approves, edits or rejects; edits feed style preferences | Core |
| Topic list review | Bad Topics break Weak Topic tracking | Extra |
| Delete Notes or a Study Space | Destructive | Extra |
| Learned Material review | Gate before assessments; never blocks chat | Extra |
| Profile fact or style change | Personal data | Extra |

## 5. Screens

Spaces list · Space dashboard (Notes, Topics, Weak Topics, Learned Material review) · Chat · Study (Quiz and Test runner) · Flashcards · Settings and Developer (models, temperature, max tokens, tool toggles, token and cost display). Developer settings are kept separate from the student's screens.

A visual prototype exists as a private artifact: [Jimmy: Study Tutor Prototype](https://claude.ai/artifact/TSNW2vrvQXEA6QRmi1WLDt). It shows four distinct source-label styles (solid line for Notes, double line for the Library, dashed and hatched for web content, dotted for Tutor Knowledge), so that source never relies on colour alone.

### Prototype elements still to build

The empty Chat (`features/chat/components/ChatEmpty.tsx`) follows the prototype but leaves these out until the feature behind them exists. Add each one in the issue that builds it.

| Element | Prototype behaviour | Built in |
| --- | --- | --- |
| Chats | A Study Space has several chats. The right column of the Chat screen holds "Chats" (newest first, grouped by day, twenty at a time) beside "Sources"; on a phone a "Chats" button in the chat header opens the list in a bottom sheet. "New chat" sits in the chat header and at the top of the list, with "Back to your last chat" under the empty card. A chat can be renamed (empty goes back to the first question) and deleted after a confirmation, from its "⋯" menu or by right-click. | [#60](https://github.com/cristimihailfilipgreenbay/jimmy/issues/60) |

## 6. Feedback and personalisation

The student can rate each answer 👍/👎. Repeated feedback may propose a Profile style change (for example "shorter explanations"), which needs Approval. The Profile also holds language and explanation style, shared across Study Spaces. Answers follow the language set in the Profile; the UI is English.

Two things in this feature are not in the prototype, because the issue asks for them: the Settings "Answers" section (language, answer length, and the styles the Student approved, each with a remove button), and the "Jimmy noticed what you rate down" card above the chat composer, which looks like the Flashcards style notice and asks "Use this style" or "No thanks". The 👎 reason chips are the prototype's; the chosen one stays highlighted, and "Too long" is the one that counts toward a proposal.

## 7. Evaluation

- **Demo data.** A seed script downloads 2–3 OpenStax chapters each for Biology and Physics into `data/seed/` (not committed), with `ATTRIBUTION.md` giving title, author and licence.
- **Golden set.** About 20 questions across the two Spaces: answerable from Notes, only from the Library, needing the web fallback, and out of scope.
- **Ragas.** Faithfulness, context precision and context recall.
- **Custom checks.** Share of answers with correct Citations; quiz answer keys matching the source (LLM judge); Conflict detection on a small set with planted wrong statements in Notes.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Wrong answer key | Quizzes use only Notes and Library; show the source passage with each answer |
| Poisoned web content | Injection scan before promotion; Learned Material treated as data and gated (ADR 0002) |
| Wrong Tutor Knowledge | Always labelled; never used for assessments |
| Unreadable scanned PDFs | Detected and reported to the student |
| Runaway agent loops | Iteration cap and doom-loop stop |
| Cross-Space leakage | Single retrieval function, unit-tested (ADR 0001) |
| Guardrail model not freely available | The spike found it blocked; a prompted classifier on an allowed model replaces it (ADR 0003) |

## 9. Out of scope for v1

Posting or publishing anything, image generation, analytics, password reset by email, OCR, hybrid search, spaced-repetition scheduling, deployment.
