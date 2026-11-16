import { useMutation } from '@tanstack/react-query'
import { switchLibrary } from './library'
import { useSyncLibrary } from './useSyncLibrary'

export function useSwitchLibrary(studentId: string, spaceId: string) {
  const sync = useSyncLibrary(studentId, spaceId)
  return useMutation({ mutationFn: (enabled: boolean) => switchLibrary(spaceId, enabled), onSuccess: sync })
}
