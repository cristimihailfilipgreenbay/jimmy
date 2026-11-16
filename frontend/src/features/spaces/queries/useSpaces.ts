import { useQuery } from '@tanstack/react-query'
import { listSpaces } from './spaces'
import { spacesKey } from './spacesKey'

export const useSpaces = (studentId: string) => useQuery({ queryKey: spacesKey(studentId), queryFn: listSpaces })
