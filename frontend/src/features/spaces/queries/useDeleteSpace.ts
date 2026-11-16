import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteSpace } from './spaces'
import { spacesKey } from './spacesKey'

export function useDeleteSpace(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSpace(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: spacesKey(studentId) }),
  })
}
