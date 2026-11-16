import { z } from 'zod'

// Mirrors the backend's PackOut and LibraryOut.
export const packSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  author: z.string(),
  license: z.string(),
  source_url: z.string(),
  subject: z.string(),
})
export type Pack = z.infer<typeof packSchema>

export const libraryStateSchema = z.object({
  pack: packSchema.nullable(),
  enabled: z.boolean(),
  status: z.enum(['none', 'indexing', 'ready', 'failed']),
  chapters_ready: z.number(),
  chapters_total: z.number(),
  chapters: z.array(z.number()),
  cited_in_answers: z.number(),
})
export type LibraryState = z.infer<typeof libraryStateSchema>
