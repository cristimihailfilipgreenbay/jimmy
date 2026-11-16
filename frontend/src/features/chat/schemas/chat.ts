import { z } from 'zod'

// Mirrors the backend's ThreadOut, CitationOut and MessageOut.
export const threadSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  kind: z.string(),
  title: z.string(),
  created_at: z.string(),
})
export type Thread = z.infer<typeof threadSchema>

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
  created_at: z.string(),
})
export type Message = z.infer<typeof messageSchema>

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
  z.object({ type: z.literal('cost'), tokens_in: z.number(), tokens_out: z.number(), usd: z.number().nullable() }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
  z.object({ type: z.literal('done'), message_id: z.string(), trace_id: z.string().nullable(), content: z.string() }),
])
export type StreamEvent = z.infer<typeof streamEventSchema>

export const messageInSchema = z.string().trim().min(1).max(8000)
