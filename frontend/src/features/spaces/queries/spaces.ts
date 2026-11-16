import { z } from 'zod'
import { request, requestVoid } from '@/lib/http'
import { spaceSchema, type Accent } from '../schemas/space'

export type NewSpace = { name: string; course: string; accent: Accent }

export const listSpaces = () => request('/spaces', z.array(spaceSchema))
export const createSpace = (space: NewSpace) =>
  request('/spaces', spaceSchema, { method: 'POST', body: JSON.stringify(space) })
export const deleteSpace = (id: string) => requestVoid(`/spaces/${id}`, { method: 'DELETE' })
