import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteAllTopics, deleteTopic } from './topics'
import { topicsKey } from './useTopics'

/** Delete the given Topics, or every Topic of the Space when `topicIds` is 'all'. */
export function useDeleteTopic(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (topicIds: string[] | 'all') => (topicIds === 'all' ? deleteAllTopics(spaceId) : Promise.all(topicIds.map((id) => deleteTopic(spaceId, id))).then(() => undefined)),
    onSuccess: () => qc.invalidateQueries({ queryKey: topicsKey(studentId, spaceId) }),
  })
}
