import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signOut } from './auth'
import { meKey } from './useMe'

export function useSignOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      qc.clear()
      qc.setQueryData(meKey, null)
    },
  })
}
