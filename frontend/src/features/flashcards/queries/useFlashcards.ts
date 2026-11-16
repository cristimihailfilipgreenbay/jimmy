import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CardDecision, Draft } from '../schemas/flashcards'
import { approveFact, deleteFact, fetchDeck, fetchDrafts, fetchFacts, reviewDrafts } from './flashcards'

const deckKey = (studentId: string, spaceId: string) => ['flashcards', studentId, spaceId] as const
const draftsKey = (studentId: string, spaceId: string) => ['flashcard-drafts', studentId, spaceId] as const
const factsKey = (studentId: string) => ['profile-facts', studentId] as const

export const useDeck = (studentId: string, spaceId: string) => useQuery({ queryKey: deckKey(studentId, spaceId), queryFn: () => fetchDeck(spaceId) })

/** Every draft waiting for review, each with the batch (and pause) it belongs to. */
export const useDrafts = (studentId: string, spaceId: string) =>
  useQuery({
    queryKey: draftsKey(studentId, spaceId),
    queryFn: () => fetchDrafts(spaceId),
    select: (batches): Draft[] => batches.flatMap((b) => b.cards.map((c) => ({ ...c, threadId: b.thread_id, interruptId: b.interrupt_id }))),
  })

/** A review can add cards to the deck and propose a style, so all three lists are refetched. */
export function useReviewDraft(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ draft, decision }: { draft: Draft; decision: CardDecision }) => reviewDrafts(draft.threadId, draft.interruptId, [decision]),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: deckKey(studentId, spaceId) }),
        qc.invalidateQueries({ queryKey: draftsKey(studentId, spaceId) }),
        qc.invalidateQueries({ queryKey: factsKey(studentId) }),
      ]),
  })
}

/** The card style the Student's edits showed, waiting for their Approval. */
export const useStyleProposal = (studentId: string) =>
  useQuery({
    queryKey: factsKey(studentId),
    queryFn: fetchFacts,
    select: (facts) => facts.find((f) => f.kind === 'style' && f.origin === 'flashcard_edits' && f.status === 'proposed') ?? null,
  })

export function useDecideStyle(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => (approve ? approveFact(id).then(() => undefined) : deleteFact(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: factsKey(studentId) }),
  })
}
