import type { QueryClient } from '@tanstack/react-query'
import type { Student } from '../schemas/auth'
import { meKey } from './useMe'

/**
 * Switch the cache to a new session: drop everything cached for the previous
 * one, then publish who is signed in (null after sign-out).
 *
 * Not `queryClient.clear()`: that removes the `me` query itself, and the pages
 * watching it (the redirect after sign-up, the route guard) stay attached to the
 * removed query and never see the new value.
 */
export function replaceSession(qc: QueryClient, student: Student | null) {
  qc.removeQueries({ predicate: (query) => query.queryKey[0] !== meKey[0] })
  qc.setQueryData(meKey, student)
}
