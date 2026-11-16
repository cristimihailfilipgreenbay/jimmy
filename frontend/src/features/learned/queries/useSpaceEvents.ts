import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Book, TriangleAlert } from 'lucide-react'
import { toast } from '@/lib/toast'
import { jobEventSchema } from '../schemas/learned'
import { learnedKey } from './useLearnedMaterial'

/**
 * Listens to the Space's background work while a page of it is open. When a Finding
 * has been saved (or could not be), the Student sees a toast and the Learned
 * Material list refreshes. Nothing is replayed: only work that finishes while open.
 */
export function useSpaceEvents(studentId: string, spaceId: string | undefined) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!spaceId) return
    const source = new EventSource(`/api/spaces/${spaceId}/events`)
    source.addEventListener('job', (e) => {
      const parsed = jobEventSchema.safeParse(JSON.parse((e as MessageEvent<string>).data))
      if (!parsed.success) return
      const { outcome, status, message } = parsed.data
      if (outcome === 'saved') {
        toast(message, Book)
        void qc.invalidateQueries({ queryKey: learnedKey(studentId, spaceId) })
      } else if (status === 'failed') toast(message, TriangleAlert)
    })
    return () => source.close()
  }, [qc, studentId, spaceId])
}
