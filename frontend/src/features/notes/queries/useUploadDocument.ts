import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadDocument } from './documents'
import { documentsKey } from './useDocuments'

export function useUploadDocument(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadDocument(spaceId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: documentsKey(studentId, spaceId) }),
  })
}
