import { useQuery } from '@tanstack/react-query'
import { getHealth } from './health'

export const useHealth = () =>
  useQuery({ queryKey: ['health'], queryFn: getHealth, refetchInterval: 10_000 })
