import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getStoredStudentId, storeStudentId } from '@/lib/identity'
import { createStudent, listStudents, type Student } from './api'
import { forgetStudentIds, getKnownStudentIds, rememberStudentId } from './knownStudents'

type StudentState = {
  students: Student[]
  current: Student | null
  loading: boolean
  select: (id: string) => void
  create: (name: string) => Promise<void>
}

const Ctx = createContext<StudentState | null>(null)
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
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStudent() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStudent must be used inside StudentProvider')
  return ctx
}
