import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signIn } from './auth'
import { meKey } from './useMe'

export function useSignIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: signIn,
    onSuccess: (student) => {
      qc.clear() // nothing cached for another Student may survive
      qc.setQueryData(meKey, student)
    },
  })
}
