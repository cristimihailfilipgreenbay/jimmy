import { request, requestVoid } from '@/lib/http'
import { studentSchema } from '../schemas/auth'

export const getMe = () => request('/auth/me', studentSchema)

export const signUp = (body: { email: string; password: string }) =>
  request('/auth/sign-up', studentSchema, { method: 'POST', body: JSON.stringify(body) })

export const signIn = (body: { email: string; password: string; remember: boolean }) =>
  request('/auth/sign-in', studentSchema, { method: 'POST', body: JSON.stringify(body) })

export const signOut = () => requestVoid('/auth/sign-out', { method: 'POST' })
