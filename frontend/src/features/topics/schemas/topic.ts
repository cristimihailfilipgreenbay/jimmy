import { z } from 'zod'

// Mirrors the backend's TopicOut.
export const topicSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  name: z.string(),
  status: z.string(),
  created_at: z.string(),
})
export type Topic = z.infer<typeof topicSchema>

// A Topic name is one line of at most 120 characters (the backend's MAX_NAME).
export const topicNameSchema = z.string().trim().min(1, 'Enter a name.').max(120, 'Use 120 characters or fewer.')

// The pause the ingestion run waits on (GET /threads/{id}), for kind "topic_review".
export const topicReviewPayloadSchema = z.object({
  document_id: z.string(),
  proposed: z.array(z.object({ id: z.string(), name: z.string(), existing_id: z.string().nullable() })),
  existing: z.array(z.object({ id: z.string(), name: z.string() })),
})
export type TopicReviewPayload = z.infer<typeof topicReviewPayloadSchema>

export const threadDetailSchema = z.object({
  id: z.uuid(),
  interrupt: z
    .object({ interrupt_id: z.string(), kind: z.string(), payload: z.unknown() })
    .nullable(),
})

// The Student's answer: one entry per Topic (the backend's TopicDecision).
export type TopicDecision =
  | { id: string; action: 'approve' }
  | { id: string; action: 'rename'; name: string }
  | { id: string; action: 'merge'; into: string }
  | { id: string; action: 'remove' }
