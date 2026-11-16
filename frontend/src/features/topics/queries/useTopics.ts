import { useQuery } from '@tanstack/react-query'
import { fetchTopics } from './topics'

export const topicsKey = (studentId: string, spaceId: string) => ['topics', studentId, spaceId] as const

/**
 * The Space's Topics. Saving the approved ones happens in the background after the
 * Student answers the review, so pass `refresh` while a document is still being
 * processed to keep looking.
 */
export const useTopics = (studentId: string, spaceId: string, refresh = false) =>
  useQuery({
    queryKey: topicsKey(studentId, spaceId),
    queryFn: () => fetchTopics(spaceId),
    refetchInterval: refresh ? 2000 : false,
  })
