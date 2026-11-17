import { useInfiniteQuery } from '@tanstack/react-query'
import { nextCursor } from '@/lib/pagination'
import { listSpaces } from './spaces'
import { spacesKey } from './spacesKey'

/** The Student's Spaces, newest first, twelve at a time (`fetchNextPage` loads more). `total` counts them all and `accents` lists the colours in use. */
export const useSpaces = (studentId: string) =>
  useInfiniteQuery({
    queryKey: spacesKey(studentId),
    queryFn: ({ pageParam }) => listSpaces(pageParam),
    ...nextCursor,
    select: (data) => ({ spaces: data.pages.flatMap((p) => p.items), total: data.pages[0]?.total ?? 0, accents: data.pages[0]?.accents ?? [] }),
  })
