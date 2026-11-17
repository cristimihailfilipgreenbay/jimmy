import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Profile } from '../schemas/settings'
import { fetchProfile, updateProfile } from './settings'

const profileKey = (studentId: string) => ['profile', studentId] as const

export const useProfile = (studentId: string) => useQuery({ queryKey: profileKey(studentId), queryFn: fetchProfile })

/** Saves a change at once and shows it before the answer comes back; a failure puts it back. */
export function useUpdateProfile(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onMutate: async (changes: Partial<Profile>) => {
      await qc.cancelQueries({ queryKey: profileKey(studentId) })
      const before = qc.getQueryData<Profile>(profileKey(studentId))
      qc.setQueryData<Profile>(profileKey(studentId), (old) => (old ? { ...old, ...changes } : old))
      return { before }
    },
    onError: (_err, _changes, context) => qc.setQueryData(profileKey(studentId), context?.before),
    onSettled: () => qc.invalidateQueries({ queryKey: profileKey(studentId) }),
  })
}
