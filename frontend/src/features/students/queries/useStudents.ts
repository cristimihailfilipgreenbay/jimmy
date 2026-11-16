import { useQuery } from '@tanstack/react-query'
import { getStoredStudentId, storeStudentId } from '@/lib/identity'
import { forgetStudentIds, getKnownStudentIds } from '../lib/knownStudents'
import type { Student } from '../schemas/student'
import { listStudents } from './students'

export const studentsKey = ['students'] as const

async function loadStudents(): Promise<Student[]> {
  const known = getKnownStudentIds()
  const list = await listStudents(known)
  // Forget profiles that no longer exist, including a remembered current one.
  forgetStudentIds(known.filter((id) => !list.some((s) => s.id === id)))
  const stored = getStoredStudentId()
  if (stored && !list.some((s) => s.id === stored)) storeStudentId(null)
  return list
}

export const useStudents = () => useQuery({ queryKey: studentsKey, queryFn: loadStudents })
