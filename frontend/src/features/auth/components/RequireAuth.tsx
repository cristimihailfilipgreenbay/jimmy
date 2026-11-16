import { Navigate, Outlet } from 'react-router'
import { useMe } from '../queries/useMe'

export function RequireAuth() {
  const { data, isPending } = useMe()
  if (isPending) return null
  if (!data) return <Navigate to="/sign-in" replace />
  return <Outlet />
}
