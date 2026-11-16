export type Health = { status: 'ok' | 'degraded'; database: 'ok' | 'down' }

export async function getHealth(): Promise<Health> {
  const res = await fetch('/api/health')
  if (!res.ok && res.status !== 503) throw new Error(`health ${res.status}`)
  return res.json()
}
