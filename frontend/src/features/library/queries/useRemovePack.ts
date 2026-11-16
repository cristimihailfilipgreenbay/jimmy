import { useMutation } from '@tanstack/react-query'
import { removePack } from './library'
import { useSyncLibrary } from './useSyncLibrary'

export function useRemovePack(studentId: string, spaceId: string) {
  const sync = useSyncLibrary(studentId, spaceId)
  return useMutation({ mutationFn: (packId: string) => removePack(spaceId, packId), onSuccess: sync })
}
