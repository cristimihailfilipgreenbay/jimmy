import { documentSchema } from '../schemas/document'
import { request, requestVoid } from '@/lib/http'

export const uploadDocument = (spaceId: string, file: File) => {
  const body = new FormData()
  body.append('file', file)
  return request(`/spaces/${spaceId}/documents`, documentSchema, { method: 'POST', body })
}

export const deleteDocument = (spaceId: string, documentId: string) =>
  requestVoid(`/spaces/${spaceId}/documents/${documentId}`, { method: 'DELETE' })
