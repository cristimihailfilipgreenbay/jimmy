import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTopic } from './topics'
import { topicsKey } from './useTopics'

export function useDeleteTopic(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (topicIds: string[]) => Promise.all(topicIds.map((id) => deleteTopic(spaceId, id))),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicsKey(studentId, spaceId) }),
  })
}
