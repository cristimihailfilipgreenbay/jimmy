import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signIn } from './auth'
import { replaceSession } from './session'

export function useSignIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: signIn,
    onSuccess: (student) => replaceSession(qc, student),
  })
}
