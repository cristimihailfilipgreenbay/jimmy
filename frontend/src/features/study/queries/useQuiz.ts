import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DisputeDecision } from '../schemas/study'
import { answerQuestion, decideDispute, fetchRecap, fetchSession, startSession } from './study'
import { weakKey } from './useWeakTopics'

export const useStartQuiz = (spaceId: string) => useMutation({ mutationFn: (topicIds: string[]) => startSession(spaceId, topicIds) })

/** An answer can change which Topics are weak, so the Weak topics list is refetched. */
export function useAnswerQuestion(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, questionId, answer }: { sessionId: string; questionId: string; answer: string }) =>
      answerQuestion(sessionId, questionId, answer),
    onSuccess: () => qc.invalidateQueries({ queryKey: weakKey(studentId, spaceId) }),
  })
}

/** The Student's decision on a grade changes the Weak Topic record, so it is refetched. */
export function useDecideDispute(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ threadId, interruptId, decision }: { threadId: string; interruptId: string; decision: DisputeDecision }) =>
      decideDispute(threadId, interruptId, decision),
    onSuccess: () => qc.invalidateQueries({ queryKey: weakKey(studentId, spaceId) }),
  })
}

export const useRecap = (sessionId: string | undefined) =>
  useQuery({ queryKey: ['recap', sessionId], queryFn: () => fetchRecap(sessionId!), enabled: !!sessionId })

/** Asks the backend to write a question that failed earlier, and returns the session. */
export const useReloadQuiz = () => useMutation({ mutationFn: (sessionId: string) => fetchSession(sessionId) })
