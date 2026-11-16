import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { request } from '@/lib/http'
import { searchHitSchema } from '../schemas/search'

export const searchLibrary = (spaceId: string, q: string) =>
  request(`/spaces/${spaceId}/library/search?${new URLSearchParams({ q })}`, z.array(searchHitSchema))

/** Passages of the Space's textbook matching `q` (misspellings included). Waits for 2+ characters. */
export const useLibrarySearch = (studentId: string, spaceId: string, q: string) =>
  useQuery({
    queryKey: ['library-search', studentId, spaceId, q],
    queryFn: () => searchLibrary(spaceId, q),
    enabled: q.length >= 2,
  })
