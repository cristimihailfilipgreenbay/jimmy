import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSpace, deleteSpace, listSpaces, type Accent } from './api'

// Keyed by Student so switching profiles never serves another Student's cache.
const spacesKey = (studentId: string) => ['spaces', studentId] as const

export const useSpaces = (studentId: string) =>
  useQuery({ queryKey: spacesKey(studentId), queryFn: listSpaces })

export function useCreateSpace(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { name: string; accent: Accent }) => createSpace(v.name, v.accent),
    onSuccess: () => qc.invalidateQueries({ queryKey: spacesKey(studentId) }),
  })
}

export function useDeleteSpace(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSpace(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: spacesKey(studentId) }),
  })
}
