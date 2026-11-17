import { documentSchema } from '@/features/notes/schemas/document'
import { request, requestVoid } from '@/lib/http'
import { pageQuery } from '@/lib/pagination'
import { TOPICS_PAGE, threadDetailSchema, topicReviewPayloadSchema, topicSchema, topicsPageSchema, type TopicDecision } from '../schemas/topic'

export const fetchTopics = (spaceId: string, cursor: string | null) => request(`/spaces/${spaceId}/topics${pageQuery(cursor, { limit: TOPICS_PAGE })}`, topicsPageSchema)

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

/** Every Topic of the Space at once. */
export const deleteAllTopics = (spaceId: string) => requestVoid(`/spaces/${spaceId}/topics`, { method: 'DELETE' })
export const deleteTopic = (spaceId: string, topicId: string) =>
  requestVoid(`/spaces/${spaceId}/topics/${topicId}`, { method: 'DELETE' })
