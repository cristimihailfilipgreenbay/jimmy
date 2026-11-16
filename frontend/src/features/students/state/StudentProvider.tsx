import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { getStoredStudentId, storeStudentId } from '@/lib/identity'
import { useCreateStudent } from '../queries/useCreateStudent'
import { useStudents } from '../queries/useStudents'
import { StudentContext } from './StudentContext'

export function StudentProvider({ children }: { children: ReactNode }) {
  const [currentId, setCurrentId] = useState<string | null>(getStoredStudentId())
  const { data, isPending } = useStudents()
  const { mutateAsync } = useCreateStudent()

  const select = useCallback((id: string) => {
    storeStudentId(id)
    setCurrentId(id)
  }, [])

  const create = useCallback(
    async (name: string) => {
      select((await mutateAsync(name)).id)
    },
    [mutateAsync, select],
  )

  const value = useMemo(() => {
    const students = data ?? []
    return { students, current: students.find((s) => s.id === currentId) ?? null, loading: isPending, select, create }
  }, [data, currentId, isPending, select, create])
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}
