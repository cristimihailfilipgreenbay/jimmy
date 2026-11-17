import { z } from 'zod'
import { cursorPage } from '@/lib/pagination'

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

// One page of the Student's Spaces, with the colours their Spaces use.
export const spacesPageSchema = cursorPage(spaceSchema).extend({ accents: z.array(accentSchema) })
/** How many Spaces load at a time. */
export const SPACES_PAGE = 12

// Mirrors the backend's SpaceIn.
export const spaceNameSchema = z.string().trim().min(1, 'Enter a name.').max(80, 'Use 80 characters or fewer.')
export const spaceCourseSchema = z.string().trim().max(120, 'Use 120 characters or fewer.')
