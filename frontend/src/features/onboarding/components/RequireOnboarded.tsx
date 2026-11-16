import { Navigate, Outlet } from 'react-router'
import { useMe } from '@/features/auth/queries/useMe'

/** Everything inside the app is closed to a Student who has not finished onboarding. */
export function RequireOnboarded() {
  const { data } = useMe()
  if (!data?.onboarded) return <Navigate to="/welcome" replace />
  return <Outlet />
}
