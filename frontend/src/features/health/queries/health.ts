import { z } from 'zod'

const healthSchema = z.object({ status: z.enum(['ok', 'degraded']), database: z.enum(['ok', 'down']) })
export type Health = z.infer<typeof healthSchema>

export async function getHealth(): Promise<Health> {
  const res = await fetch('/api/health')
  if (!res.ok && res.status !== 503) throw new Error(`health ${res.status}`)
  return healthSchema.parse(await res.json())
}
