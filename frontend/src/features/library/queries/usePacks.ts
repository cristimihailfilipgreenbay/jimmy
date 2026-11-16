import { useQuery } from '@tanstack/react-query'
import { listPacks } from './library'

export const usePacks = (studentId: string, enabled = true) =>
  useQuery({ queryKey: ['packs', studentId], queryFn: listPacks, enabled })
