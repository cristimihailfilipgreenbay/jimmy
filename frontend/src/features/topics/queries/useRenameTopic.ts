import { useMutation, useQueryClient } from '@tanstack/react-query'
import { renameTopic } from './topics'
import { topicsKey } from './useTopics'

export function useRenameTopic(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; name: string }) => renameTopic(spaceId, v.id, v.name),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicsKey(studentId, spaceId) }),
  })
}
