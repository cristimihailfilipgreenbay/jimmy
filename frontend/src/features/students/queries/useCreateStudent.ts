import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rememberStudentId } from '../lib/knownStudents'
import type { Student } from '../schemas/student'
import { createStudent } from './students'
import { studentsKey } from './useStudents'

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createStudent,
    onSuccess: (student) => {
      rememberStudentId(student.id)
      qc.setQueryData<Student[]>(studentsKey, (prev) => [...(prev ?? []), student])
    },
  })
}
