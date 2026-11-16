import { z } from 'zod'

// Mirrors the backend's LearnedMaterialOut (app/learned/schemas.py).
export const learnedMaterialSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  publisher: z.string().nullable(),
  url: z.string(),
  excerpt: z.string(),
  reason: z.string().nullable(),
  status: z.enum(['unreviewed', 'approved']),
  fetched_at: z.string().nullable(),
  created_at: z.string(),
  approved_at: z.string().nullable(),
  used_in_answers: z.number(),
})
export type LearnedMaterial = z.infer<typeof learnedMaterialSchema>

// The `job` event of GET /spaces/{id}/events (docs/api.md): background work that finished.
export const jobEventSchema = z.object({
  job_id: z.string(),
  kind: z.string(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled']),
  message: z.string(),
  outcome: z.string().nullable().optional(),
})
export type JobEvent = z.infer<typeof jobEventSchema>
