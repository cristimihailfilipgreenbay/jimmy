import { useMe } from '../queries/useMe'

/** The signed-in Student. Only call this below RequireAuth. */
export function useSignedInStudent() {
  const { data } = useMe()
  if (!data) throw new Error('useSignedInStudent must be used below RequireAuth')
  return data
}
