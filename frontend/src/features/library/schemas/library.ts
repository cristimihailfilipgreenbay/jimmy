import { z } from 'zod'
import { cursorPage } from '@/lib/pagination'

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

// The state of a Space's Library, without the shelf: the books come a page at a time.
export const libraryStateSchema = z.object({
  enabled: z.boolean(),
  status: z.enum(['none', 'indexing', 'ready', 'failed']),
  book_count: z.number(),
  chapters_ready: z.number(),
  chapters_total: z.number(),
  // The textbooks on the shelf, so the catalogue can mark the ones already added.
  pack_ids: z.array(z.uuid()),
})
export type LibraryState = z.infer<typeof libraryStateSchema>

export const shelfPageSchema = cursorPage(shelfBookSchema)
export const packsPageSchema = cursorPage(packSchema)
/** How many textbooks load at a time, on the shelf and in the catalogue. */
export const LIBRARY_PAGE = 20
