import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createThread, listMessages, listThreads } from './chat'

export const threadsKey = (studentId: string, spaceId: string) => ['threads', studentId, spaceId] as const
export const messagesKey = (threadId: string) => ['messages', threadId] as const

export const useThreads = (studentId: string, spaceId: string) =>
  useQuery({ queryKey: threadsKey(studentId, spaceId), queryFn: () => listThreads(spaceId) })

export const useMessages = (threadId: string | undefined) =>
  useQuery({ queryKey: messagesKey(threadId ?? ''), queryFn: () => listMessages(threadId!), enabled: !!threadId })

export function useCreateThread(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => createThread(spaceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: threadsKey(studentId, spaceId) }),
  })
}
