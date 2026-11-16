import { z } from 'zod'

// Mirrors the backend's flashcards schemas (app/flashcards/schemas.py, app/profile/schemas.py).
export const cardSchema = z.object({
  id: z.uuid(),
  topic_id: z.uuid(),
  topic: z.string(),
  front: z.string(),
  back: z.string(),
  status: z.string(),
  was_edited: z.boolean(),
  source: z.object({
    source_type: z.string(),
    document: z.string(),
    author: z.string().nullable(),
    page_or_section: z.string().nullable(),
    passage: z.string(),
    url: z.string().nullish(),
  }),
  created_at: z.string(),
})
export type Card = z.infer<typeof cardSchema>

// Drafts waiting for the Student, with the pause they answer at /threads/{id}/resume.
export const draftBatchSchema = z.object({
  thread_id: z.uuid(),
  interrupt_id: z.string(),
  cards: z.array(cardSchema),
})
export type DraftBatch = z.infer<typeof draftBatchSchema>

/** A draft with the batch that waits on it. */
export type Draft = Card & { threadId: string; interruptId: string }

export type CardDecision = { id: string; action: 'approve' | 'reject' } | { id: string; action: 'edit'; front: string; back: string }

export const reviewOutSchema = z.object({
  approved: z.number(),
  rejected: z.number(),
  remaining: z.number(),
  style: z.object({ id: z.uuid(), text: z.string() }).nullable(),
})
export type ReviewOut = z.infer<typeof reviewOutSchema>

export const factSchema = z.object({
  id: z.uuid(),
  kind: z.string(),
  text: z.string(),
  status: z.string(),
  origin: z.string(),
  created_at: z.string(),
})
export type Fact = z.infer<typeof factSchema>
