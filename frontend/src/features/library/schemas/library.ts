import { z } from 'zod'

// Mirrors the backend's PackOut, ShelfBook and LibraryOut.
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

export const shelfBookSchema = z.object({
  pack: packSchema,
  status: z.enum(['indexing', 'ready', 'failed']),
  chapters_ready: z.number(),
  chapters_total: z.number(),
  chapters: z.array(z.number()),
  cited_in_answers: z.number(),
})
export type ShelfBook = z.infer<typeof shelfBookSchema>

export const libraryStateSchema = z.object({
  enabled: z.boolean(),
  status: z.enum(['none', 'indexing', 'ready', 'failed']),
  books: z.array(shelfBookSchema),
})
export type LibraryState = z.infer<typeof libraryStateSchema>
