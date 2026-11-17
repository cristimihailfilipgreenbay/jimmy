import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { nextCursor } from '@/lib/pagination'
import { createThread, listMessages, listThreads } from './chat'

export const threadsKey = (studentId: string, spaceId: string) => ['threads', studentId, spaceId] as const
export const messagesKey = (threadId: string) => ['messages', threadId] as const

export const useThreads = (studentId: string, spaceId: string) =>
  useQuery({ queryKey: threadsKey(studentId, spaceId), queryFn: () => listThreads(spaceId) })

/**
 * A conversation's messages, oldest first. The newest thirty load first; `fetchNextPage`
 * loads the thirty before the oldest one shown. The server sends each page newest page
 * first, so the pages are put back in time order here.
 */
export const useMessages = (threadId: string | undefined) =>
  useInfiniteQuery({
    queryKey: messagesKey(threadId ?? ''),
    queryFn: ({ pageParam }) => listMessages(threadId!, pageParam),
    ...nextCursor,
    enabled: !!threadId,
    select: (data) => ({ messages: [...data.pages].reverse().flatMap((p) => p.items), total: data.pages[0]?.total ?? 0 }),
  })

export function useCreateThread(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => createThread(spaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: threadsKey(studentId, spaceId) }),
  })
}
