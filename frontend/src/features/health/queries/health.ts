import { healthSchema, type Health } from '../schemas/health'

export async function getHealth(): Promise<Health> {
  const res = await fetch('/api/health')
  if (!res.ok && res.status !== 503) throw new Error(`health ${res.status}`)
  return healthSchema.parse(await res.json())
}
