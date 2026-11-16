import { request } from '@/lib/http'

export type Student = { id: string; display_name: string }

export async function listStudents(ids: string[]): Promise<Student[]> {
  if (ids.length === 0) return []
  return request<Student[]>(`/students?${ids.map((id) => `ids=${encodeURIComponent(id)}`).join('&')}`)
}

export const createStudent = (display_name: string) =>
  request<Student>('/students', { method: 'POST', body: JSON.stringify({ display_name }) })
