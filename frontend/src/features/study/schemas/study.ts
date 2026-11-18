import { z } from 'zod'
import { cursorPage } from '@/lib/pagination'

// Mirrors the backend's study schemas (app/study/schemas.py).
const sourceSchema = z.object({
  source_type: z.string(),
  document: z.string(),
  author: z.string().nullable(),
  page_or_section: z.string().nullable(),
  passage: z.string(),
  url: z.string().nullish(),
})

export const questionSchema = z.object({
  id: z.uuid(),
  topic_id: z.uuid(),
  topic: z.string(),
  position: z.number(),
  type: z.enum(['multiple_choice', 'short_answer', 'essay']),
  prompt: z.string(),
  options: z.array(z.string()).nullable(),
  difficulty: z.string(),
})
export type Question = z.infer<typeof questionSchema>

// A grade the grader was unsure of: the Student's answer beside the Source passage.
export const disputeSchema = z.object({
  interrupt_id: z.string(),
  question_id: z.uuid(),
  topic: z.string(),
  prompt: z.string(),
  answer: z.string(),
  correct_answer: z.string(),
  score: z.number(),
  confidence: z.number(),
  source: sourceSchema,
})
export type Dispute = z.infer<typeof disputeSchema>
export const DISPUTE_DECISIONS = ['correct', 'incorrect', 'unsure'] as const
export type DisputeDecision = (typeof DISPUTE_DECISIONS)[number]

export const sessionSchema = z.object({
  id: z.uuid(),
  thread_id: z.uuid(),
  space_id: z.uuid(),
  kind: z.string(),
  // The kind of question it asks; a session saved before this was kept counts as mixed.
  format: z.string().default('mixed'),
  status: z.enum(['active', 'finished']),
  question_count: z.number(),
  answered: z.number(),
  difficulty: z.string(),
  current: questionSchema.nullable(),
  dispute: disputeSchema.nullish(),
  started_at: z.string(),
})
export type StudySession = z.infer<typeof sessionSchema>

export const feedbackSchema = z.object({
  question_id: z.uuid(),
  position: z.number(),
  topic_id: z.uuid(),
  topic: z.string(),
  type: z.string(),
  prompt: z.string(),
  options: z.array(z.string()).nullable(),
  answer: z.string(),
  correct: z.boolean(),
  score: z.number(),
  correct_answer: z.string(),
  explanation: z.string(),
  note: z.string().nullable(),
  // An Essay: each rubric line, how well it was met (0, 0.5 or 1) and why.
  criteria: z.array(z.object({ criterion: z.string(), met: z.number(), comment: z.string() })).nullish(),
  source: sourceSchema,
  topic_weak: z.boolean(),
  graded_by: z.string(),
  decision: z.enum(DISPUTE_DECISIONS).nullish(),
})
export type Feedback = z.infer<typeof feedbackSchema>

// No feedback yet while a Dispute waits for the Student's decision.
export const answerOutSchema = z.object({ feedback: feedbackSchema.nullable(), session: sessionSchema })

export type AnswerOut = z.infer<typeof answerOutSchema>

// A finished Quiz or Test, one row of the past sessions list.
export const pastSessionSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['quiz', 'test']),
  format: z.string().default('mixed'),
  finished_at: z.string(),
  score: z.number(),
  total: z.number(),
  topics: z.array(z.string()),
  // The Topics that were weak when the session finished.
  weak_left: z.array(z.string()),
})
export type PastSession = z.infer<typeof pastSessionSchema>

// One page of them: `total` matches the filter, `total_all` does not.
export const pastSessionsSchema = z.object({ items: z.array(pastSessionSchema), total: z.number(), total_all: z.number() })
export type PastSessionsPage = z.infer<typeof pastSessionsSchema>
export const PAST_SESSIONS_PAGE = 10

export const recapSchema = z.object({
  session_id: z.uuid(),
  kind: z.enum(['quiz', 'test']),
  format: z.string().default('mixed'),
  finished_at: z.string().nullable(),
  weak_left: z.array(z.string()),
  score: z.number(),
  total: z.number(),
  by_topic: z.array(z.object({ topic_id: z.uuid(), topic: z.string(), correct: z.number(), total: z.number(), weak: z.boolean() })),
  questions: z.array(feedbackSchema),
})
export type Recap = z.infer<typeof recapSchema>

// What a session already showed, to pick it up again after a reload: a Quiz's feedback, or
// the answers given in a Test.
export const historySchema = z.object({
  feedback: z.array(feedbackSchema),
  taken: z.array(z.object({ question: questionSchema, answer: z.string() })),
})
export type History = z.infer<typeof historySchema>

export const weakTopicSchema = z.object({
  topic_id: z.uuid(),
  name: z.string(),
  consecutive_correct: z.number(),
  updated_at: z.string(),
})
export type WeakTopic = z.infer<typeof weakTopicSchema>
export const weakTopicsPageSchema = cursorPage(weakTopicSchema)
/** How many weak Topics load at a time. */
export const WEAK_PAGE = 30

/** How many questions a Quick Quiz asks, an Essay session (one essay), and a Test. */
export const QUIZ_LENGTH = 5
export const ESSAY_LENGTH = 1
export const TEST_LENGTH = 10

export type StudyKind = 'quiz' | 'test'

/** What the Student can start: a Quiz (multiple choice), short written answers, an Essay, or a Test (a mix). */
export type StudyMode = 'quiz' | 'short' | 'essay' | 'test'
export const STUDY_MODES: Record<StudyMode, { kind: StudyKind; format: string; count: number; title: string }> = {
  quiz: { kind: 'quiz', format: 'multiple_choice', count: QUIZ_LENGTH, title: 'Quick Quiz' },
  short: { kind: 'quiz', format: 'short_answer', count: QUIZ_LENGTH, title: 'Short answers' },
  essay: { kind: 'quiz', format: 'essay', count: ESSAY_LENGTH, title: 'Essay' },
  test: { kind: 'test', format: 'mixed', count: TEST_LENGTH, title: 'Test' },
}

/** The mode a session was started in (one saved before formats existed was a Quiz). */
export const modeOf = (s: { kind: string; format: string }): StudyMode =>
  s.kind === 'test' ? 'test' : s.format === 'short_answer' ? 'short' : s.format === 'essay' ? 'essay' : 'quiz'
