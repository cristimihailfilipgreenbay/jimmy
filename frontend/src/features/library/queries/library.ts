import { request } from '@/lib/http'
import { pageQuery } from '@/lib/pagination'
import { LIBRARY_PAGE, libraryStateSchema, packsPageSchema, shelfPageSchema } from '../schemas/library'

export const getLibrary = (spaceId: string) => request(`/spaces/${spaceId}/library`, libraryStateSchema)

/** A page of the catalogue by title, or of the packs matching `q`, best match first (misspellings included). */
export const listPacks = (q: string, cursor: string | null) => request(`/libraries${pageQuery(cursor, { limit: LIBRARY_PAGE, q: q || undefined })}`, packsPageSchema)

/** A page of the textbooks on a Space's shelf, by title. */
export const listBooks = (spaceId: string, cursor: string | null) => request(`/spaces/${spaceId}/library/books${pageQuery(cursor, { limit: LIBRARY_PAGE })}`, shelfPageSchema)

/** Switch the Space's whole Library on or off. */
export const switchLibrary = (spaceId: string, enabled: boolean) =>
  request(`/spaces/${spaceId}/library`, libraryStateSchema, { method: 'PUT', body: JSON.stringify({ enabled }) })

export const addPack = (spaceId: string, packId: string) =>
  request(`/spaces/${spaceId}/library/packs/${packId}`, libraryStateSchema, { method: 'PUT' })

export const removePack = (spaceId: string, packId: string) =>
  request(`/spaces/${spaceId}/library/packs/${packId}`, libraryStateSchema, { method: 'DELETE' })
