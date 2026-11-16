# Jimmy

A study assistant for university students. It answers questions, quizzes, and explains a subject using the student's own notes, an optional open textbook library, and the tutor's own subject knowledge, always telling the student where each statement comes from.

## Language

### People and scope

**Student**:
The person using Jimmy to learn one or more subjects.
_Avoid_: User, learner, customer

**Study Space**:
An isolated area for one subject (e.g. Biology) holding its own notes, library, weak topics, flashcards and quiz history.
_Avoid_: Course, workspace, project, folder

**Profile**:
The student's preferences shared across all Study Spaces, such as language and explanation style.
_Avoid_: Settings, account

### Knowledge

**Notes**:
Documents the student uploads into a Study Space (PDF, Markdown, plain text).
_Avoid_: Files, uploads, materials

**Subject Library**:
Optional open-licensed textbook chapters attached to a Study Space and switchable on or off.
_Avoid_: Knowledge base, textbook pack

**Tutor Knowledge**:
What the model itself knows about the subject, used for explanations, analogies and examples. Never used to build quizzes or flashcards.
_Avoid_: General knowledge, model memory

**Finding**:
A passage the agent fetched from outside the Study Space (Wikipedia or web search) because Notes and Subject Library had no accurate answer, kept together with its Citation.
_Avoid_: Search result, web hit

**Promotion**:
The agent's decision to save a Finding permanently into the Study Space instead of keeping it only for the current conversation.
_Avoid_: Caching, indexing, learning

**Learned Material**:
Findings that have been promoted into a Study Space, marked as web-sourced and unreviewed until the student approves them.
_Avoid_: Auto notes, web notes

**Source**:
The place a statement comes from: Notes, Subject Library, Learned Material, a Finding, or Tutor Knowledge.
_Avoid_: Reference, origin

**Citation**:
A reference to a Source passage naming the document or book, author, and page or section. Tutor Knowledge is labelled instead of cited.
_Avoid_: Link, footnote

**Conflict**:
A case where the student's Notes disagree with the Subject Library or Tutor Knowledge. The tutor flags it and never silently corrects it.
_Avoid_: Mismatch, error

### Studying

**Topic**:
A named concept within a Study Space (e.g. Photosynthesis).
_Avoid_: Subject, chapter, tag

**Weak Topic**:
A Topic the student has repeatedly answered incorrectly, remembered across sessions within its Study Space.
_Avoid_: Struggle area, bad topic

**Quiz**:
A short, interactive set of questions on chosen Topics, graded with an explanation after each answer.
_Avoid_: Exercise, drill

**Test**:
A longer assessment across several Topics whose results and explanations are shown only at the end.
_Avoid_: Exam, final quiz

**Essay**:
A written-answer question graded against a rubric derived from the Sources.
_Avoid_: Long answer, free text

**Dispute**:
A student's challenge to an automatic grade, resolved by the student's own decision after seeing their answer beside the Source passage.
_Avoid_: Appeal, complaint

**Flashcard**:
A question-and-answer pair generated from Notes and Subject Library and saved after the student approves it.
_Avoid_: Card, note card

**Study Session**:
One guided run in which the tutor picks Topics, quizzes the student, adapts difficulty, and ends with a recap.
_Avoid_: Lesson, run

**Approval**:
The student's explicit yes, edit, or no before anything is saved or a plan changes.
_Avoid_: Confirmation, review
