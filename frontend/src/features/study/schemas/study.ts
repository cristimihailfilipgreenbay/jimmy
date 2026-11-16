import { z } from 'zod'

// Mirrors the backend's study schemas (app/study/schemas.py).
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

export const sessionSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  kind: z.string(),
  status: z.enum(['active', 'finished']),
  question_count: z.number(),
  answered: z.number(),
  difficulty: z.string(),
  current: questionSchema.nullable(),
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
  source: z.object({
    source_type: z.string(),
    document: z.string(),
    author: z.string().nullable(),
    page_or_section: z.string().nullable(),
    passage: z.string(),
    url: z.string().nullish(),
  }),
  topic_weak: z.boolean(),
})
export type Feedback = z.infer<typeof feedbackSchema>

export const answerOutSchema = z.object({ feedback: feedbackSchema, session: sessionSchema })

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
