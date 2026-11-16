import { z } from 'zod'

// The ten colours from the design, by name. Mirrors the backend's Accent.
export const accentSchema = z.enum([
  'leaf-green',
  'ink-blue',
  'copper',
  'rosewood',
  'plum',
  'teal',
  'indigo',
  'ochre',
  'olive',
  'slate',
])
export type Accent = z.infer<typeof accentSchema>

export const spaceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  course: z.string().nullable(),
  accent: accentSchema,
  library_enabled: z.boolean(),
  created_at: z.string(),
})
export type Space = z.infer<typeof spaceSchema>

// Mirrors the backend's SpaceIn.
export const spaceNameSchema = z.string().trim().min(1, 'Enter a name.').max(80, 'Use 80 characters or fewer.')
export const spaceCourseSchema = z.string().trim().max(120, 'Use 120 characters or fewer.')
