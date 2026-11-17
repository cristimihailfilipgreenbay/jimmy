import { z } from 'zod'
import { cursorPage } from '@/lib/pagination'

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

// One page of the deck: `total` follows the Topic filter, `total_all` does not.
export const deckPageSchema = cursorPage(cardSchema).extend({
  total_all: z.number(),
  // The Topics that have approved cards, for the filter.
  topics: z.array(z.object({ id: z.uuid(), name: z.string() })),
})

// A draft waiting for the Student, with the pause it answers at /threads/{id}/resume.
export const draftSchema = cardSchema.extend({ thread_id: z.uuid(), interrupt_id: z.string() })
export const draftsPageSchema = cursorPage(draftSchema)

/** How many cards the deck loads at a time, and how many drafts. */
export const DECK_PAGE = 30
export const DRAFTS_PAGE = 10

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
