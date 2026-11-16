import { createContext } from 'react'
import type { Student } from '../schemas/student'

export type StudentState = {
  students: Student[]
  current: Student | null
  loading: boolean
  select: (id: string) => void
  create: (name: string) => Promise<void>
}

export const StudentContext = createContext<StudentState | null>(null)
