import { z } from 'zod'
import { request } from '@/lib/http'
import { libraryStateSchema, packSchema } from '../schemas/library'

export const getLibrary = (spaceId: string) => request(`/spaces/${spaceId}/library`, libraryStateSchema)

/** All packs, or the ones matching `q`, best match first (misspellings included). */
export const listPacks = (q = '') => request(q ? `/libraries?${new URLSearchParams({ q })}` : '/libraries', z.array(packSchema))

/** Switch the Space's whole Library on or off. */
export const switchLibrary = (spaceId: string, enabled: boolean) =>
  request(`/spaces/${spaceId}/library`, libraryStateSchema, { method: 'PUT', body: JSON.stringify({ enabled }) })

export const addPack = (spaceId: string, packId: string) =>
  request(`/spaces/${spaceId}/library/packs/${packId}`, libraryStateSchema, { method: 'PUT' })

export const removePack = (spaceId: string, packId: string) =>
  request(`/spaces/${spaceId}/library/packs/${packId}`, libraryStateSchema, { method: 'DELETE' })
