import { z } from 'zod'
import { documentSchema } from '@/features/notes/schemas/document'
import { request } from '@/lib/http'
import { threadDetailSchema, topicReviewPayloadSchema, topicSchema, type TopicDecision } from '../schemas/topic'

export const fetchTopics = (spaceId: string) => request(`/spaces/${spaceId}/topics`, z.array(topicSchema))

export const renameTopic = (spaceId: string, topicId: string, name: string) =>
  request(`/spaces/${spaceId}/topics/${topicId}`, topicSchema, { method: 'PATCH', body: JSON.stringify({ name }) })

export const mergeTopics = (spaceId: string, ids: string[], name: string) =>
  request(`/spaces/${spaceId}/topics/merge`, topicSchema, { method: 'POST', body: JSON.stringify({ ids, name }) })

/** The Topic review an ingestion run is waiting on, or null if it is not waiting. */
export async function fetchTopicReview(threadId: string) {
  const thread = await request(`/threads/${threadId}`, threadDetailSchema)
  if (thread.interrupt?.kind !== 'topic_review') return null
  return { interruptId: thread.interrupt.interrupt_id, ...topicReviewPayloadSchema.parse(thread.interrupt.payload) }
}

export const answerTopicReview = (threadId: string, interruptId: string, decision: TopicDecision[]) =>
  request(`/threads/${threadId}/resume`, documentSchema, {
    method: 'POST',
    body: JSON.stringify({ interrupt_id: interruptId, decision }),
  })
