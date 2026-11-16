import { z } from 'zod'
import { request } from '@/lib/http'

export const studentSchema = z.object({ id: z.uuid(), display_name: z.string() })
export type Student = z.infer<typeof studentSchema>

// Mirrors the backend's StudentIn.
export const studentNameSchema = z.string().trim().min(1, 'Enter a name.').max(80, 'Use 80 characters or fewer.')

export async function listStudents(ids: string[]): Promise<Student[]> {
  if (ids.length === 0) return []
  return request(`/students?${ids.map((id) => `ids=${encodeURIComponent(id)}`).join('&')}`, z.array(studentSchema))
}

export const createStudent = (display_name: string) =>
  request('/students', studentSchema, { method: 'POST', body: JSON.stringify({ display_name }) })
