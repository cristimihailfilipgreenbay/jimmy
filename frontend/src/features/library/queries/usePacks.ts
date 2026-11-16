import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listPacks } from './library'

export const usePacks = (studentId: string, q: string, enabled = true) =>
  useQuery({
    queryKey: ['packs', studentId, q],
    queryFn: () => listPacks(q),
    enabled,
    // Keep the list on screen while the next search loads.
    placeholderData: keepPreviousData,
  })
