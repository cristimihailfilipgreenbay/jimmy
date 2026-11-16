import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createStudent, getStoredStudentId, listStudents, storeStudentId, type Student } from '@/lib/api'

type StudentState = {
  students: Student[]
  current: Student | null
  loading: boolean
  select: (id: string) => void
  create: (name: string) => Promise<void>
}

const Ctx = createContext<StudentState | null>(null)

export function StudentProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>([])
  const [currentId, setCurrentId] = useState<string | null>(getStoredStudentId())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listStudents()
      .then((list) => {
        setStudents(list)
        // A remembered profile that no longer exists is dropped.
        if (currentId && !list.some((s) => s.id === currentId)) {
          storeStudentId(null)
          setCurrentId(null)
        }
      })
      .catch(() => setStudents([]))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const select = useCallback((id: string) => {
    storeStudentId(id)
    setCurrentId(id)
  }, [])

  const create = useCallback(
    async (name: string) => {
      const student = await createStudent(name)
      setStudents((prev) => [...prev, student])
      select(student.id)
    },
    [select],
  )

  const value = useMemo(
    () => ({ students, current: students.find((s) => s.id === currentId) ?? null, loading, select, create }),
    [students, currentId, loading, select, create],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStudent() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStudent must be used inside StudentProvider')
  return ctx
}
