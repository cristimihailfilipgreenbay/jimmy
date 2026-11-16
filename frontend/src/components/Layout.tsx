import { NavLink, Outlet, useParams } from 'react-router'
import { ApiStatus } from '@/features/health/ApiStatus'
import { ProfileSwitcher } from '@/features/students/ProfileSwitcher'
import { cn } from '@/lib/utils'

const link = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm hover:bg-muted',
    isActive ? 'bg-muted font-medium' : 'text-muted-foreground',
  )

export function Layout() {
  const { spaceId } = useParams()
  const base = spaceId ? `/spaces/${spaceId}` : null

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-none flex-col gap-1 border-r p-4">
        <h1 className="mb-4 text-xl font-semibold">Jimmy</h1>
        <ProfileSwitcher />
        <nav className="flex flex-col gap-1" aria-label="Main">
          <NavLink to="/" end className={link}>
            Study Spaces
          </NavLink>
          {base && (
            <>
              <NavLink to={base} end className={link}>
                Dashboard
              </NavLink>
              <NavLink to={`${base}/chat`} className={link}>
                Chat
              </NavLink>
              <NavLink to={`${base}/study`} className={link}>
                Study
              </NavLink>
              <NavLink to={`${base}/flashcards`} className={link}>
                Flashcards
              </NavLink>
            </>
          )}
          <NavLink to="/settings" className={link}>
            Settings
          </NavLink>
          <NavLink to="/developer" className={link}>
            Developer
          </NavLink>
        </nav>
        <div className="mt-auto">
          <ApiStatus />
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
