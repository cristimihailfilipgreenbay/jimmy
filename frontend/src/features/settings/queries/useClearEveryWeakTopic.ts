import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clearEveryWeakTopic } from './settings'

/** Clears every weak Topic in every Study Space; the Weak topics tabs and the Space counts reload. */
export function useClearEveryWeakTopic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: clearEveryWeakTopic,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['weak-topics'] })
      qc.invalidateQueries({ queryKey: ['spaces'] })
    },
  })
}
