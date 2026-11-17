import { useInfiniteQuery } from '@tanstack/react-query'
import { nextCursor } from '@/lib/pagination'
import { listBooks } from './library'

export const booksKey = (studentId: string, spaceId: string) => ['library-books', studentId, spaceId] as const

/** The textbooks on the Space's shelf, twenty at a time; `fetchNextPage` loads more. */
/** Pass `refresh` while a book is being indexed, to keep its progress up to date. */
export const useBooks = (studentId: string, spaceId: string, refresh = false) =>
  useInfiniteQuery({
    queryKey: booksKey(studentId, spaceId),
    queryFn: ({ pageParam }) => listBooks(spaceId, pageParam),
    ...nextCursor,
    refetchInterval: refresh ? 2000 : false,
    select: (data) => ({ books: data.pages.flatMap((p) => p.items), total: data.pages[0]?.total ?? 0 }),
  })
