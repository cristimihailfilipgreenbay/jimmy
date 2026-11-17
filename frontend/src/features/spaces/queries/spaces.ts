import { request, requestVoid } from '@/lib/http'
import { pageQuery } from '@/lib/pagination'
import { SPACES_PAGE, spaceSchema, spacesPageSchema, type Accent } from '../schemas/space'

export type NewSpace = { name: string; course: string; accent: Accent }
/** Only what is sent changes. `course: null` clears it. */
export type SpaceChanges = { name?: string; course?: string | null; accent?: Accent }

export const listSpaces = (cursor: string | null) => request(`/spaces${pageQuery(cursor, { limit: SPACES_PAGE })}`, spacesPageSchema)
export const getSpace = (id: string) => request(`/spaces/${id}`, spaceSchema)
export const createSpace = (space: NewSpace) =>
  request('/spaces', spaceSchema, { method: 'POST', body: JSON.stringify(space) })
export const updateSpace = (id: string, changes: SpaceChanges) =>
  request(`/spaces/${id}`, spaceSchema, { method: 'PATCH', body: JSON.stringify(changes) })
export const deleteSpace = (id: string) => requestVoid(`/spaces/${id}`, { method: 'DELETE' })
