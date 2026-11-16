import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateSpace, type SpaceChanges } from './spaces'
import { spacesKey } from './spacesKey'

export function useUpdateSpace(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: SpaceChanges }) => updateSpace(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: spacesKey(studentId) }),
  })
}
