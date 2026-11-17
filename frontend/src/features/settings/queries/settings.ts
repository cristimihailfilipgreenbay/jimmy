import { request } from '@/lib/http'
import { profileSchema, type Profile } from '../schemas/settings'

export const fetchProfile = () => request('/profile', profileSchema)
export const updateProfile = (changes: Partial<Profile>) => request('/profile', profileSchema, { method: 'PATCH', body: JSON.stringify(changes) })
