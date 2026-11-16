import { z } from 'zod'

// Mirrors the backend's DocumentOut (only what the screens use).
export const documentSchema = z.object({
  id: z.uuid(),
  space_id: z.uuid(),
  title: z.string(),
  status: z.string(),
})
export type Document = z.infer<typeof documentSchema>
