import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clearRating, rateAnswer } from './chat'
import { messagesKey } from './useThreads'
import type { Rating } from '../schemas/chat'

/** Rates an answer, or takes the rating back when `rating` is null. A rating that made Jimmy propose a style refreshes what it remembers. */
export function useRateAnswer(studentId: string, threadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, rating, comment }: { messageId: string; rating: Rating | null; comment?: string }) =>
      rating ? rateAnswer(messageId, rating, comment) : clearRating(messageId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: messagesKey(threadId) })
      // Shared with the Settings and Flashcards screens (features/settings/queries/useFacts.ts).
      if (result?.style_proposed) qc.invalidateQueries({ queryKey: ['profile-facts', studentId] })
    },
  })
}
