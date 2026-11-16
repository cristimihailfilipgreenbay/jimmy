import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getStoredStudentId, storeStudentId } from '@/lib/identity'
import { createStudent, listStudents, type Student } from '../api/students'
import { forgetStudentIds, getKnownStudentIds, rememberStudentId } from '../lib/knownStudents'
import { StudentContext } from './StudentContext'

const STUDENTS_KEY = ['students']

async function loadStudents(): Promise<Student[]> {
  const known = getKnownStudentIds()
  const list = await listStudents(known)
  // Forget profiles that no longer exist, including a remembered current one.
  forgetStudentIds(known.filter((id) => !list.some((s) => s.id === id)))
  const stored = getStoredStudentId()
  if (stored && !list.some((s) => s.id === stored)) storeStudentId(null)
  return list
}

export function StudentProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [currentId, setCurrentId] = useState<string | null>(getStoredStudentId())
  const { data, isPending } = useQuery({ queryKey: STUDENTS_KEY, queryFn: loadStudents })

  const select = useCallback((id: string) => {
    storeStudentId(id)
    setCurrentId(id)
  }, [])

  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: (student) => {
      rememberStudentId(student.id)
      qc.setQueryData<Student[]>(STUDENTS_KEY, (prev) => [...(prev ?? []), student])
      select(student.id)
    },
  })
  const create = useCallback(async (name: string) => void (await createMutation.mutateAsync(name)), [createMutation])

  const value = useMemo(() => {
    const students = data ?? []
    return { students, current: students.find((s) => s.id === currentId) ?? null, loading: isPending, select, create }
  }, [data, currentId, isPending, select, create])
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}
