import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nextCursor } from '@/lib/pagination'
import { createThread, deleteThread, listMessages, listThreads, renameThread } from './chat'

export const threadsKey = (studentId: string, spaceId: string) => ['threads', studentId, spaceId] as const
export const messagesKey = (threadId: string) => ['messages', threadId] as const

/** The Space's chats, the most recently active first, twenty at a time; `total` counts them all. */
export const useThreads = (studentId: string, spaceId: string) =>
  useInfiniteQuery({
    queryKey: threadsKey(studentId, spaceId),
    queryFn: ({ pageParam }) => listThreads(spaceId, pageParam),
    ...nextCursor,
    select: (data) => ({ chats: data.pages.flatMap((p) => p.items), total: data.pages[0]?.total ?? 0 }),
  })

export function useRenameChat(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameThread(id, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: threadsKey(studentId, spaceId) }),
  })
}

export function useDeleteChat(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteThread(id),
    onSuccess: async (_none, id) => {
      qc.removeQueries({ queryKey: messagesKey(id) })
      await qc.invalidateQueries({ queryKey: threadsKey(studentId, spaceId) })
    },
  })
}

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
