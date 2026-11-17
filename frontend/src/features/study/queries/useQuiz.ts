import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DisputeDecision, StudyKind } from '../schemas/study'
import { answerQuestion, decideDispute, fetchHistory, fetchPastSessions, fetchRecap, fetchSession, startSession } from './study'
import { weakKey } from './useWeakTopics'

// Every page of every filter starts with this, so one invalidation refreshes them all.
export const pastSessionsKey = (studentId: string, spaceId: string) => ['past-sessions', studentId, spaceId] as const

/** One page of the finished Quizzes and Tests of the Study Space, newest first. The page on screen stays until the next one arrives. */
export const usePastSessions = (studentId: string, spaceId: string, kind: StudyKind | 'all', page: number) =>
  useQuery({
    queryKey: [...pastSessionsKey(studentId, spaceId), kind, page],
    queryFn: () => fetchPastSessions(spaceId, kind, page),
    placeholderData: keepPreviousData,
  })

export const useStartSession = (spaceId: string) =>
  useMutation({ mutationFn: ({ kind, topicIds }: { kind: StudyKind; topicIds: string[] }) => startSession(spaceId, kind, topicIds) })

/** An answer (in a Test too, though it shows nothing yet) can change which Topics are weak, so the Weak topics list is refetched. */
export function useAnswerQuestion(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, questionId, answer }: { sessionId: string; questionId: string; answer: string }) =>
      answerQuestion(sessionId, questionId, answer),
    // The last answer finishes the session, which then joins the past sessions list.
    onSuccess: () =>
      Promise.all([qc.invalidateQueries({ queryKey: weakKey(studentId, spaceId) }), qc.invalidateQueries({ queryKey: pastSessionsKey(studentId, spaceId) })]),
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

/** A session started earlier (its id is in the address) with what it already showed. Loaded once. */
export const useStoredSession = (sessionId: string | null) =>
  useQuery({
    queryKey: ['stored-session', sessionId],
    queryFn: async () => ({ session: await fetchSession(sessionId!), history: await fetchHistory(sessionId!) }),
    enabled: !!sessionId,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  })

/** Asks the backend to write a question that failed earlier, and returns the session. */
export const useReloadQuiz = () => useMutation({ mutationFn: (sessionId: string) => fetchSession(sessionId) })
