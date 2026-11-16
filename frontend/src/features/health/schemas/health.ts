import { z } from 'zod'

export const healthSchema = z.object({ status: z.enum(['ok', 'degraded']), database: z.enum(['ok', 'down']) })
export type Health = z.infer<typeof healthSchema>
