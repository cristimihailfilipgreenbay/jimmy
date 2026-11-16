import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signOut } from './auth'
import { replaceSession } from './session'

export function useSignOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => replaceSession(qc, null),
  })
}
