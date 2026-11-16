import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signUp } from './auth'
import { meKey } from './useMe'

export function useSignUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: signUp,
    onSuccess: (student) => {
      qc.clear()
      qc.setQueryData(meKey, student)
    },
  })
}
