import { z } from 'zod'
import { request, requestVoid } from '@/lib/http'
import { answerOutSchema, historySchema, recapSchema, sessionSchema, weakTopicSchema, QUIZ_LENGTH, TEST_LENGTH, type DisputeDecision, type StudyKind } from '../schemas/study'

export const startSession = (spaceId: string, kind: StudyKind, topicIds: string[]) =>
  request(`/spaces/${spaceId}/sessions`, sessionSchema, {
    method: 'POST',
    body: JSON.stringify({ kind, topic_ids: topicIds, question_count: kind === 'test' ? TEST_LENGTH : QUIZ_LENGTH }),
  })

export const answerQuestion = (sessionId: string, questionId: string, answer: string) =>
  request(`/sessions/${sessionId}/answers`, answerOutSchema, {
    method: 'POST',
    body: JSON.stringify({ question_id: questionId, answer }),
  })

// A Dispute is answered like every other pause, on the session's thread.
export const decideDispute = (threadId: string, interruptId: string, decision: DisputeDecision) =>
  request(`/threads/${threadId}/resume`, answerOutSchema, {
    method: 'POST',
    body: JSON.stringify({ interrupt_id: interruptId, decision }),
  })

export const fetchRecap = (sessionId: string) => request(`/sessions/${sessionId}/recap`, recapSchema)
export const fetchWeakTopics = (spaceId: string) => request(`/spaces/${spaceId}/weak-topics`, z.array(weakTopicSchema))
export const clearWeakTopic = (spaceId: string, topicId: string) => requestVoid(`/spaces/${spaceId}/weak-topics/${topicId}`, { method: 'DELETE' })

export const fetchHistory = (sessionId: string) => request(`/sessions/${sessionId}/history`, historySchema)
export const fetchSession = (sessionId: string) => request(`/sessions/${sessionId}`, sessionSchema)
