import { useQuery } from '@tanstack/react-query'
import { fetchLearnedMaterial } from './learned'

export const learnedKey = (studentId: string, spaceId: string) => ['learned-material', studentId, spaceId] as const

export const useLearnedMaterial = (studentId: string, spaceId: string) =>
  useQuery({ queryKey: learnedKey(studentId, spaceId), queryFn: () => fetchLearnedMaterial(spaceId) })
