import { useQueryClient } from '@tanstack/react-query'
import { spacesKey } from '@/features/spaces/queries/spacesKey'
import type { LibraryState } from '../schemas/library'
import { libraryKey } from './useLibrary'

/** What every change to a Space's Library does with the answer: store it, refresh the Space. */
export function useSyncLibrary(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return (state: LibraryState) => {
    qc.setQueryData(libraryKey(studentId, spaceId), state)
    // The Space carries `library_enabled`, which the Chat's source guide reads.
    qc.invalidateQueries({ queryKey: spacesKey(studentId) })
  }
}
