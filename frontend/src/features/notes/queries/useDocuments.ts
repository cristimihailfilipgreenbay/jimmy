import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { request } from '@/lib/http'
import { documentSchema, PROCESSING } from '../schemas/document'

export const documentsKey = (studentId: string, spaceId: string) => ['documents', studentId, spaceId] as const

export const useDocuments = (studentId: string, spaceId: string) =>
  useQuery({
    queryKey: documentsKey(studentId, spaceId),
    queryFn: () => request(`/spaces/${spaceId}/documents`, z.array(documentSchema)),
    // Reading and indexing happen in the background: look again until they are done.
    refetchInterval: (query) => (query.state.data?.some((d) => PROCESSING.includes(d.status)) ? 2000 : false),
  })
