import { z } from 'zod'

/** The shape of a cursor-paged list (CursorPage in app/pagination.py). */
export const cursorPage = <S extends z.ZodType>(item: S) => z.object({ items: z.array(item), next_cursor: z.string().nullable(), total: z.number() })

/** `useInfiniteQuery` options that follow the cursor the server sends. */
export const nextCursor = { initialPageParam: null as string | null, getNextPageParam: (last: { next_cursor: string | null }) => last.next_cursor }

/** The query string part for a page after `cursor`, with any other parameters. */
export const pageQuery = (cursor: string | null, params: Record<string, string | number | undefined> = {}) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v))
  if (cursor) q.set('cursor', cursor)
  const text = q.toString()
  return text ? `?${text}` : ''
}
