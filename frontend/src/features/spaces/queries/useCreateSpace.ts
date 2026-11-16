import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSpace } from './spaces'
import { spacesKey } from './spacesKey'

export function useCreateSpace(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSpace,
    onSuccess: () => qc.invalidateQueries({ queryKey: spacesKey(studentId) }),
  })
}
