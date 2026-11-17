import { z } from 'zod'
import { cursorPage } from '@/lib/pagination'

// Mirrors the backend's ThreadOut, CitationOut and MessageOut.
export const threadSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  kind: z.string(),
  title: z.string(),
  created_at: z.string(),
})
export type Thread = z.infer<typeof threadSchema>

// A chat in the list (ThreadItemOut): its name, when it was last active, how long it is.
export const threadItemSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  message_count: z.number(),
})
export type ThreadItem = z.infer<typeof threadItemSchema>
export const threadsPageSchema = cursorPage(threadItemSchema)
/** How many chats load at a time. */
export const THREADS_PAGE = 20

export const citationSchema = z.object({
  id: z.number(),
  source_type: z.string(),
  document: z.string(),
  author: z.string().nullable(),
  page_or_section: z.string().nullable(),
  passage: z.string(),
  // Only a web Finding has these.
  url: z.string().nullish(),
  fetched_at: z.string().nullish(),
})
export type Citation = z.infer<typeof citationSchema>

export const messageSchema = z.object({
  id: z.uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  citations: z.array(citationSchema),
  tokens_in: z.number().nullable(),
  tokens_out: z.number().nullable(),
  cost_usd: z.number().nullable(),
  trace_id: z.string().nullable(),
  model: z.string().nullable(),
  created_at: z.string(),
  // The Student's 👍/👎 on this answer, and why.
  rating: z.enum(['up', 'down']).nullable(),
  rating_comment: z.string().nullable(),
})
export type Message = z.infer<typeof messageSchema>
export const messagesPageSchema = cursorPage(messageSchema)
/** How many messages load at a time. */
export const MESSAGES_PAGE = 30

// A pause the Student must answer (docs/api.md section 4). Only the Conflict exists so far.
export const conflictDecisionSchema = z.enum(['keep_notes', 'accept_other', 'unsure'])
export type ConflictDecision = z.infer<typeof conflictDecisionSchema>

export const conflictPayloadSchema = z.object({
  topic: z.string(),
  notes: citationSchema,
  other: citationSchema,
})
export type ConflictPayload = z.infer<typeof conflictPayloadSchema>

// The server-sent events of POST /threads/{id}/messages (docs/api.md section 3).
export const streamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('token'), text: z.string() }),
  z.object({ type: z.literal('reset') }),
  z.object({
    type: z.literal('tool_call'),
    tool: z.string(),
    status: z.enum(['started', 'finished', 'failed']),
    description: z.string().optional(),
    found: z.number().optional(),
  }),
  z.object({ type: z.literal('citation') }).extend(citationSchema.shape),
  z.object({ type: z.literal('interrupt'), interrupt_id: z.string(), kind: z.literal('conflict'), payload: conflictPayloadSchema }),
  z.object({ type: z.literal('cost'), tokens_in: z.number(), tokens_out: z.number(), usd: z.number().nullable() }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
  z.object({ type: z.literal('done'), message_id: z.string(), trace_id: z.string().nullable(), content: z.string() }),
])
export type StreamEvent = z.infer<typeof streamEventSchema>

export const messageInSchema = z.string().trim().min(1).max(8000)

// Mirrors the backend's ConflictOut (only what the chat needs).
export const storedConflictSchema = z.object({
  id: z.uuid(),
  topic: z.string(),
  other_source_type: z.enum(['library', 'learned']),
  decision: conflictDecisionSchema,
})

export const ratingSchema = z.enum(['up', 'down'])
export type Rating = z.infer<typeof ratingSchema>

/** Why a 👎 was given. "Too long" is the one that is about style, and repeated it proposes a change. */
export const DOWN_REASONS = ['Wrong source', 'Factually wrong', 'Too long', 'Didn’t answer'] as const

// Mirrors the backend's FeedbackOut.
export const feedbackSchema = z.object({
  message_id: z.string(),
  rating: ratingSchema,
  comment: z.string().nullable(),
  style_proposed: z.boolean(),
})
