import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clearWeakTopic, fetchWeakTopics } from './study'

export const weakKey = (studentId: string, spaceId: string) => ['weak-topics', studentId, spaceId] as const

export const useWeakTopics = (studentId: string, spaceId: string) =>
  useQuery({ queryKey: weakKey(studentId, spaceId), queryFn: () => fetchWeakTopics(spaceId) })

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
    mutationFn: (topicIds: string[]) => Promise.all(topicIds.map((id) => clearWeakTopic(spaceId, id))),
    onSettled: () => qc.invalidateQueries({ queryKey: weakKey(studentId, spaceId) }),
  })
}
