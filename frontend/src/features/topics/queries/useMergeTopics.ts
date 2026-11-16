import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mergeTopics } from './topics'
import { topicsKey } from './useTopics'

export function useMergeTopics(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { ids: string[]; name: string }) => mergeTopics(spaceId, v.ids, v.name),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicsKey(studentId, spaceId) }),
  })
}
