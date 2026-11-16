import { z } from 'zod'

export const studentSchema = z.object({ id: z.uuid(), display_name: z.string() })
export type Student = z.infer<typeof studentSchema>

// Mirrors the backend's StudentIn.
export const studentNameSchema = z.string().trim().min(1, 'Enter a name.').max(80, 'Use 80 characters or fewer.')
