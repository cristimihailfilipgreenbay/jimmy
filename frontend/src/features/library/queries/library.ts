import { z } from 'zod'
import { request } from '@/lib/http'
import { libraryStateSchema, packSchema } from '../schemas/library'

/** `packId: null` detaches the Library; the same pack again switches it on or off. */
export type LibraryChange = { packId: string | null; enabled?: boolean }

export const getLibrary = (spaceId: string) => request(`/spaces/${spaceId}/library`, libraryStateSchema)
/** All packs, or the ones matching `q`, best match first (misspellings included). */
export const listPacks = (q = '') => request(q ? `/libraries?${new URLSearchParams({ q })}` : '/libraries', z.array(packSchema))
export const putLibrary = (spaceId: string, { packId, enabled = true }: LibraryChange) =>
  request(`/spaces/${spaceId}/library`, libraryStateSchema, {
    method: 'PUT',
    body: JSON.stringify({ pack_id: packId, enabled }),
  })
