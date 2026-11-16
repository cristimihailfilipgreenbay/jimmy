import { z } from 'zod'

// The error shape from docs/api.md.
export const apiErrorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) })
