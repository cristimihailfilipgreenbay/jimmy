export type Health = { status: 'ok' | 'degraded'; database: 'ok' | 'down' }
export type Student = { id: string; display_name: string }
export type Accent = 'default' | 'biology' | 'physics' | 'chemistry' | 'history' | 'math'
export type Space = { id: string; name: string; accent: Accent; library_enabled: boolean; created_at: string }

const STUDENT_KEY = 'jimmy.studentId'

export function getStoredStudentId(): string | null {
  try {
    return localStorage.getItem(STUDENT_KEY)
  } catch {
    return null
  }
}

export function storeStudentId(id: string | null) {
  try {
    if (id) localStorage.setItem(STUDENT_KEY, id)
    else localStorage.removeItem(STUDENT_KEY)
  } catch {
    // Private mode: the profile just is not remembered.
  }
}

const KNOWN_KEY = 'jimmy.knownStudentIds'

// Profiles this browser has created or used. The backend only lists these.
export function getKnownStudentIds(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KNOWN_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function rememberStudentId(id: string) {
  try {
    const ids = getKnownStudentIds()
    if (!ids.includes(id)) localStorage.setItem(KNOWN_KEY, JSON.stringify([...ids, id]))
  } catch {
    // Private mode: the profile just is not remembered.
  }
}

export function forgetStudentIds(gone: string[]) {
  try {
    localStorage.setItem(KNOWN_KEY, JSON.stringify(getKnownStudentIds().filter((id) => !gone.includes(id))))
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const studentId = getStoredStudentId()
  if (studentId) headers.set('X-Student-Id', studentId)
  if (init.body) headers.set('Content-Type', 'application/json')
  const res = await fetch(`/api${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error?.code ?? 'unknown', body?.error?.message ?? `Request failed (${res.status})`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export async function getHealth(): Promise<Health> {
  const res = await fetch('/api/health')
  if (!res.ok && res.status !== 503) throw new Error(`health ${res.status}`)
  return res.json()
}

export async function listStudents(ids: string[]): Promise<Student[]> {
  if (ids.length === 0) return []
  return request<Student[]>(`/students?${ids.map((id) => `ids=${encodeURIComponent(id)}`).join('&')}`)
}
export const createStudent = (display_name: string) =>
  request<Student>('/students', { method: 'POST', body: JSON.stringify({ display_name }) })

export const listSpaces = () => request<Space[]>('/spaces')
export const createSpace = (name: string, accent: Accent) =>
  request<Space>('/spaces', { method: 'POST', body: JSON.stringify({ name, accent }) })
export const deleteSpace = (id: string) => request<void>(`/spaces/${id}`, { method: 'DELETE' })
