import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { request } from '@/lib/http'
import { documentSchema } from '../schemas/document'

export const documentsKey = (studentId: string, spaceId: string) => ['documents', studentId, spaceId] as const

export const useDocuments = (studentId: string, spaceId: string) =>
  useQuery({
    queryKey: documentsKey(studentId, spaceId),
    queryFn: () => request(`/spaces/${spaceId}/documents`, z.array(documentSchema)),
  })
