import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approveFact, deleteFact, fetchFacts } from './settings'

// The same key the Flashcards screen uses, so both see one list.
export const factsKey = (studentId: string) => ['profile-facts', studentId] as const

/** What Jimmy remembers about the Student: facts and style preferences, with their status. */
export const useFacts = (studentId: string) => useQuery({ queryKey: factsKey(studentId), queryFn: fetchFacts })

/** The style change that feedback made Jimmy propose, waiting for the Student's Approval. */
export const useAnswerStyleProposal = (studentId: string) =>
  useQuery({
    queryKey: factsKey(studentId),
    queryFn: fetchFacts,
    select: (facts) => facts.find((f) => f.kind === 'style' && f.origin === 'feedback' && f.status === 'proposed') ?? null,
  })

/** Approve a proposed style (it shapes the next answers), or delete a fact. */
export function useDecideFact(studentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => (approve ? approveFact(id).then(() => undefined) : deleteFact(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: factsKey(studentId) }),
  })
}
