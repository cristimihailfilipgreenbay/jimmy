import { useMutation, useQueryClient } from '@tanstack/react-query'
import { approveLearnedMaterial, deleteLearnedMaterial } from './learned'
import { learnedKey } from './useLearnedMaterial'

export function useApproveLearned(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => approveLearnedMaterial(spaceId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: learnedKey(studentId, spaceId) }),
  })
}

export function useDeleteLearned(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLearnedMaterial(spaceId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: learnedKey(studentId, spaceId) }),
  })
}
