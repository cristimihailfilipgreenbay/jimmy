import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signUp } from './auth'
import { replaceSession } from './session'

export function useSignUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: signUp,
    onSuccess: (student) => replaceSession(qc, student),
  })
}
