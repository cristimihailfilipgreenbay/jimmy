import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { nextCursor } from '@/lib/pagination'
import type { CardDecision, Draft } from '../schemas/flashcards'
import { approveFact, deleteFact, fetchDeck, fetchDrafts, fetchFacts, reviewDrafts } from './flashcards'

const deckKey = (studentId: string, spaceId: string) => ['flashcards', studentId, spaceId] as const
const draftsKey = (studentId: string, spaceId: string) => ['flashcard-drafts', studentId, spaceId] as const
const factsKey = (studentId: string) => ['profile-facts', studentId] as const

/** The approved cards, thirty at a time, for one Topic or all ('all'). `fetchNextPage` loads more. */
export const useDeck = (studentId: string, spaceId: string, topicId: string) =>
  useInfiniteQuery({
    queryKey: [...deckKey(studentId, spaceId), topicId],
    queryFn: ({ pageParam }) => fetchDeck(spaceId, topicId, pageParam),
    ...nextCursor,
    // Changing the Topic filter keeps the cards on screen until the new ones arrive.
    placeholderData: keepPreviousData,
    select: (data) => ({
      cards: data.pages.flatMap((p) => p.items),
      total: data.pages[0]?.total ?? 0,
      totalAll: data.pages[0]?.total_all ?? 0,
      topics: data.pages[0]?.topics ?? [],
    }),
  })

/** The drafts waiting for review, ten at a time, each with the pause it answers at. */
export const useDrafts = (studentId: string, spaceId: string) =>
  useInfiniteQuery({
    queryKey: draftsKey(studentId, spaceId),
    queryFn: ({ pageParam }) => fetchDrafts(spaceId, pageParam),
    ...nextCursor,
    select: (data) => ({
      drafts: data.pages.flatMap((p) => p.items.map(({ thread_id, interrupt_id, ...card }): Draft => ({ ...card, threadId: thread_id, interruptId: interrupt_id }))),
      total: data.pages[0]?.total ?? 0,
    }),
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
