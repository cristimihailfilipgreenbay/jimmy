import { useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsKey } from '@/features/notes/queries/useDocuments'
import type { TopicDecision } from '../schemas/topic'
import { answerTopicReview } from './topics'
import { topicsKey } from './useTopics'

export function useAnswerTopicReview(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { threadId: string; interruptId: string; decision: TopicDecision[] }) =>
      answerTopicReview(v.threadId, v.interruptId, v.decision),
    onSuccess: (_doc, v) => {
      qc.removeQueries({ queryKey: ['topic-review', v.threadId] })
      qc.invalidateQueries({ queryKey: documentsKey(studentId, spaceId) })
      qc.invalidateQueries({ queryKey: topicsKey(studentId, spaceId) })
    },
  })
}
