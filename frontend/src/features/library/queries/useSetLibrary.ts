import { useMutation, useQueryClient } from '@tanstack/react-query'
import { spacesKey } from '@/features/spaces/queries/spacesKey'
import { putLibrary, type LibraryChange } from './library'
import { libraryKey } from './useLibrary'

export function useSetLibrary(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (change: LibraryChange) => putLibrary(spaceId, change),
    onSuccess: (state) => {
      qc.setQueryData(libraryKey(studentId, spaceId), state)
      // The Space carries `library_enabled`, which the Chat's source guide reads.
      qc.invalidateQueries({ queryKey: spacesKey(studentId) })
    },
  })
}
