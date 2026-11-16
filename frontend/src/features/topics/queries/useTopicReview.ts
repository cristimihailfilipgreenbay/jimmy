import { useQuery } from '@tanstack/react-query'
import { fetchTopicReview } from './topics'

/** The proposed Topics for a document, while its ingestion run waits for the Student. */
export const useTopicReview = (threadId: string | null) =>
  useQuery({
    queryKey: ['topic-review', threadId],
    queryFn: () => fetchTopicReview(threadId!),
    enabled: threadId !== null,
    // The run is paused, so what it proposed does not change under the Student.
    staleTime: Infinity,
  })
