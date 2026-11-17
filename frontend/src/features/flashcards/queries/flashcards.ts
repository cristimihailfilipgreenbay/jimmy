import { z } from 'zod'
import { request, requestVoid } from '@/lib/http'
import { pageQuery } from '@/lib/pagination'
import { DECK_PAGE, DRAFTS_PAGE, deckPageSchema, draftsPageSchema, factSchema, reviewOutSchema, type CardDecision } from '../schemas/flashcards'

export const fetchDeck = (spaceId: string, topicId: string, cursor: string | null) =>
  request(`/spaces/${spaceId}/flashcards${pageQuery(cursor, { limit: DECK_PAGE, topic_id: topicId === 'all' ? undefined : topicId })}`, deckPageSchema)
export const fetchDrafts = (spaceId: string, cursor: string | null) => request(`/spaces/${spaceId}/flashcards/drafts${pageQuery(cursor, { limit: DRAFTS_PAGE })}`, draftsPageSchema)

// Decisions on drafts are answered like every other pause, on the batch's thread.
export const reviewDrafts = (threadId: string, interruptId: string, decision: CardDecision[]) =>
  request(`/threads/${threadId}/resume`, reviewOutSchema, {
    method: 'POST',
    body: JSON.stringify({ interrupt_id: interruptId, decision }),
  })

export const fetchFacts = () => request('/profile/facts', z.array(factSchema))
export const approveFact = (id: string) => request(`/profile/facts/${id}/approve`, factSchema, { method: 'POST' })
export const deleteFact = (id: string) => requestVoid(`/profile/facts/${id}`, { method: 'DELETE' })
