import { z } from 'zod'

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
  source: sourceSchema,
  topic_weak: z.boolean(),
  graded_by: z.string(),
  decision: z.enum(DISPUTE_DECISIONS).nullish(),
})
export type Feedback = z.infer<typeof feedbackSchema>

// No feedback yet while a Dispute waits for the Student's decision.
export const answerOutSchema = z.object({ feedback: feedbackSchema.nullable(), session: sessionSchema })

export type AnswerOut = z.infer<typeof answerOutSchema>

export const recapSchema = z.object({
  session_id: z.uuid(),
  score: z.number(),
  total: z.number(),
  by_topic: z.array(z.object({ topic_id: z.uuid(), topic: z.string(), correct: z.number(), total: z.number(), weak: z.boolean() })),
  questions: z.array(feedbackSchema),
})
export type Recap = z.infer<typeof recapSchema>

export const weakTopicSchema = z.object({
  topic_id: z.uuid(),
  name: z.string(),
  consecutive_correct: z.number(),
  updated_at: z.string(),
})
export type WeakTopic = z.infer<typeof weakTopicSchema>

/** How many questions a Quiz asks. */
export const QUIZ_LENGTH = 5
