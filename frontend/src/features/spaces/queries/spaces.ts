import { z } from 'zod'
import { request, requestVoid } from '@/lib/http'
import { spaceSchema, type Accent } from '../schemas/space'

export const listSpaces = () => request('/spaces', z.array(spaceSchema))
export const createSpace = (name: string, accent: Accent) =>
  request('/spaces', spaceSchema, { method: 'POST', body: JSON.stringify({ name, accent }) })
export const deleteSpace = (id: string) => requestVoid(`/spaces/${id}`, { method: 'DELETE' })
