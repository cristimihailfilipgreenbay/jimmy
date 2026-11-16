import { request } from '@/lib/http'

export type Accent =
  | 'slate'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
export type Space = { id: string; name: string; accent: Accent; library_enabled: boolean; created_at: string }

export const listSpaces = () => request<Space[]>('/spaces')
export const createSpace = (name: string, accent: Accent) =>
  request<Space>('/spaces', { method: 'POST', body: JSON.stringify({ name, accent }) })
export const deleteSpace = (id: string) => request<void>(`/spaces/${id}`, { method: 'DELETE' })
