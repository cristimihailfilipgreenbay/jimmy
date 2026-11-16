import { z } from 'zod'
import { request, requestVoid } from '@/lib/http'
import { cardSchema, draftBatchSchema, factSchema, reviewOutSchema, type CardDecision } from '../schemas/flashcards'

export const fetchDeck = (spaceId: string) => request(`/spaces/${spaceId}/flashcards`, z.array(cardSchema))
export const fetchDrafts = (spaceId: string) => request(`/spaces/${spaceId}/flashcards/drafts`, z.array(draftBatchSchema))

// Decisions on drafts are answered like every other pause, on the batch's thread.
export const reviewDrafts = (threadId: string, interruptId: string, decision: CardDecision[]) =>
  request(`/threads/${threadId}/resume`, reviewOutSchema, {
    method: 'POST',
    body: JSON.stringify({ interrupt_id: interruptId, decision }),
  })

export const fetchFacts = () => request('/profile/facts', z.array(factSchema))
export const approveFact = (id: string) => request(`/profile/facts/${id}/approve`, factSchema, { method: 'POST' })
export const deleteFact = (id: string) => requestVoid(`/profile/facts/${id}`, { method: 'DELETE' })
