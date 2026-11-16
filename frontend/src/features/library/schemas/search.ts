import { z } from 'zod'

// Mirrors the backend's SearchHitOut.
export const searchHitSchema = z.object({
  chunk_id: z.uuid(),
  document: z.string(),
  author: z.string().nullable(),
  page_or_section: z.string().nullable(),
  passage: z.string(),
  score: z.number(),
})
export type SearchHit = z.infer<typeof searchHitSchema>
