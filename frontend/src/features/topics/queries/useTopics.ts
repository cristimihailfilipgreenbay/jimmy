import { useInfiniteQuery } from '@tanstack/react-query'
import { nextCursor } from '@/lib/pagination'
import { fetchTopics } from './topics'

export const topicsKey = (studentId: string, spaceId: string) => ['topics', studentId, spaceId] as const

/**
 * The Space's Topics by name, thirty at a time (`fetchNextPage` loads more); `total` counts them all. Saving the approved ones happens in the background after the
 * Student answers the review, so pass `refresh` while a document is still being
 * processed to keep looking.
 */
export const useTopics = (studentId: string, spaceId: string, refresh = false) =>
  useInfiniteQuery({
    queryKey: topicsKey(studentId, spaceId),
    queryFn: ({ pageParam }) => fetchTopics(spaceId, pageParam),
    ...nextCursor,
    select: (data) => ({ topics: data.pages.flatMap((p) => p.items), total: data.pages[0]?.total ?? 0 }),
    refetchInterval: refresh ? 2000 : false,
  })
