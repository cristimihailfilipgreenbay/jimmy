import { z } from 'zod'
import { request, requestVoid } from '@/lib/http'

// The accent is only a colour the Student picked. Mirrors the backend's Accent.
export const accentSchema = z.enum(['slate', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink'])
export type Accent = z.infer<typeof accentSchema>

export const spaceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  accent: accentSchema,
  library_enabled: z.boolean(),
  created_at: z.string(),
})
export type Space = z.infer<typeof spaceSchema>

// Mirrors the backend's SpaceIn.
export const spaceNameSchema = z.string().trim().min(1, 'Enter a name.').max(80, 'Use 80 characters or fewer.')

export const listSpaces = () => request('/spaces', z.array(spaceSchema))
export const createSpace = (name: string, accent: Accent) =>
  request('/spaces', spaceSchema, { method: 'POST', body: JSON.stringify({ name, accent }) })
export const deleteSpace = (id: string) => requestVoid(`/spaces/${id}`, { method: 'DELETE' })
