import { useQuery } from '@tanstack/react-query'
import { getSpace } from './spaces'
import { spaceKey } from './spacesKey'

/** One Study Space by id, whatever page of the list it is on. A missing one is an error, not a retry. */
export const useSpace = (studentId: string, spaceId: string | undefined) =>
  useQuery({ queryKey: spaceKey(studentId, spaceId ?? ''), queryFn: () => getSpace(spaceId!), enabled: !!spaceId, retry: false })
