import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDocument } from './documents'
import { documentsKey } from './useDocuments'

export function useDeleteDocument(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(spaceId, documentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentsKey(studentId, spaceId) }),
  })
}
