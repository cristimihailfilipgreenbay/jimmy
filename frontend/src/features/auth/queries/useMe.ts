import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/lib/http'
import type { Student } from '../schemas/auth'
import { getMe } from './auth'

export const meKey = ['me'] as const

// Not signed in is a normal answer (null), not an error.
async function loadMe(): Promise<Student | null> {
  try {
    return await getMe()
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

export const useMe = () => useQuery({ queryKey: meKey, queryFn: loadMe })
