import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nextCursor } from '@/lib/pagination'
import { clearAllWeakTopics, clearWeakTopic, fetchWeakTopics } from './study'

export const weakKey = (studentId: string, spaceId: string) => ['weak-topics', studentId, spaceId] as const

/** The weak Topics by name, thirty at a time (`fetchNextPage` loads more); `total` counts them all. */
export const useWeakTopics = (studentId: string, spaceId: string) =>
  useInfiniteQuery({
    queryKey: weakKey(studentId, spaceId),
    queryFn: ({ pageParam }) => fetchWeakTopics(spaceId, pageParam),
    ...nextCursor,
    select: (data) => ({ weak: data.pages.flatMap((p) => p.items), total: data.pages[0]?.total ?? 0 }),
  })

export function useClearWeakTopic(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (topicId: string) => clearWeakTopic(spaceId, topicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: weakKey(studentId, spaceId) }),
  })
}

export function useClearAllWeakTopics(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearAllWeakTopics(spaceId),
    onSettled: () => qc.invalidateQueries({ queryKey: weakKey(studentId, spaceId) }),
  })
}
