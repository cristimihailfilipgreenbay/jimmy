import { z } from 'zod'

// Mirrors the backend's DocumentOut (only what the screens use).
export const documentSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  title: z.string(),
  author: z.string().nullable(),
  filename: z.string(),
  mime_type: z.string(),
  page_count: z.number().nullable(),
  status: z.string(),
  rejection_reason: z.string().nullable(),
  thread_id: z.uuid().nullable(),
  created_at: z.string(),
})
export type Document = z.infer<typeof documentSchema>

// While a document is in one of these, the server is still working on it.
export const PROCESSING = ['uploaded', 'extracting', 'embedding']
