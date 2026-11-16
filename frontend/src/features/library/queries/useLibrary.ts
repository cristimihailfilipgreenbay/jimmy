import { useQuery } from '@tanstack/react-query'
import { getLibrary } from './library'

export const libraryKey = (studentId: string, spaceId: string) => ['library', studentId, spaceId] as const

export const useLibrary = (studentId: string, spaceId: string) =>
  useQuery({
    queryKey: libraryKey(studentId, spaceId),
    queryFn: () => getLibrary(spaceId),
    // The chapters are indexed in the background: look again until they are done.
    refetchInterval: (query) => (query.state.data?.status === 'indexing' ? 2000 : false),
  })
