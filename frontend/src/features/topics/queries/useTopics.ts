import { useQuery } from '@tanstack/react-query'
import { fetchTopics } from './topics'

export const topicsKey = (studentId: string, spaceId: string) => ['topics', studentId, spaceId] as const

export const useTopics = (studentId: string, spaceId: string) =>
  useQuery({ queryKey: topicsKey(studentId, spaceId), queryFn: () => fetchTopics(spaceId) })
