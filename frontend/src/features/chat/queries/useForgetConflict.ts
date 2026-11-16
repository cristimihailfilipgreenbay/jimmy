import { useMutation } from '@tanstack/react-query'
import { forgetConflict, listConflicts } from './chat'

/** Forgets the stored decision for a Conflict card, so Jimmy asks again next time. */
export const useForgetConflict = (spaceId: string) =>
  useMutation({
    mutationFn: async ({ topic, otherSourceType }: { topic: string; otherSourceType: string }) => {
      // The card only knows the topic; the list is newest first, so take the latest match.
      const found = (await listConflicts(spaceId)).find((c) => c.topic === topic && c.other_source_type === otherSourceType)
      if (found) await forgetConflict(spaceId, found.id)
    },
  })
