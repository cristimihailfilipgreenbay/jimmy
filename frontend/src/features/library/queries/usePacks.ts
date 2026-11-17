import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { nextCursor } from '@/lib/pagination'
import { listPacks } from './library'

/** The catalogue (or the packs matching `q`), twenty at a time; `fetchNextPage` loads more. */
export const usePacks = (studentId: string, q: string, enabled = true) =>
  useInfiniteQuery({
    queryKey: ['packs', studentId, q],
    queryFn: ({ pageParam }) => listPacks(q, pageParam),
    ...nextCursor,
    enabled,
    select: (data) => ({ packs: data.pages.flatMap((p) => p.items), total: data.pages[0]?.total ?? 0 }),
    // Keep the list on screen while the next search loads.
    placeholderData: keepPreviousData,
  })
