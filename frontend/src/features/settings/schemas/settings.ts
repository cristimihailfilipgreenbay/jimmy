import { z } from 'zod'

// Mirrors the backend's ProfileOut (app/profile/schemas.py).
export const profileSchema = z.object({
  // Off: a Quiz or Test is written up front at one difficulty. On: it follows the answers.
  adaptive_difficulty: z.boolean(),
})
export type Profile = z.infer<typeof profileSchema>
