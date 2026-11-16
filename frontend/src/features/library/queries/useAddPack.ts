import { useMutation } from '@tanstack/react-query'
import { addPack } from './library'
import { useSyncLibrary } from './useSyncLibrary'

export function useAddPack(studentId: string, spaceId: string) {
  const sync = useSyncLibrary(studentId, spaceId)
  return useMutation({ mutationFn: (packId: string) => addPack(spaceId, packId), onSuccess: sync })
}
