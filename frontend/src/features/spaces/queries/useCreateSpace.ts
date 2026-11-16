import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Accent } from '../schemas/space'
import { createSpace } from './spaces'
import { spacesKey } from './spacesKey'

export function useCreateSpace(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { name: string; accent: Accent }) => createSpace(v.name, v.accent),
    onSuccess: () => qc.invalidateQueries({ queryKey: spacesKey(studentId) }),
  })
}
