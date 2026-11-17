import { z } from 'zod'
import { request, requestVoid } from '@/lib/http'
import { factSchema, profileSchema, type Profile } from '../schemas/settings'

export const fetchProfile = () => request('/profile', profileSchema)
export const updateProfile = (changes: Partial<Profile>) => request('/profile', profileSchema, { method: 'PATCH', body: JSON.stringify(changes) })
export const fetchFacts = () => request('/profile/facts', z.array(factSchema))
export const approveFact = (id: string) => request(`/profile/facts/${id}/approve`, factSchema, { method: 'POST' })
export const deleteFact = (id: string) => requestVoid(`/profile/facts/${id}`, { method: 'DELETE' })
