import { Check, ChevronDown, Code, LayoutGrid, LogOut, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { Logo } from '@/components/Logo'
import { SpaceTabs } from '@/components/SpaceTabs'
import { Button } from '@/components/ui/button'
import { DropdownMenu, MenuButton, MenuDivider, MenuLink } from '@/components/DropdownMenu'
import { useSignOut } from '@/features/auth/queries/useSignOut'
import type { Student } from '@/features/auth/schemas/auth'
import { accentStyle } from '@/features/spaces/lib/accents'
import type { Space } from '@/features/spaces/schemas/space'

const initials = (student: Student) => {
  const words = (student.display_name ?? '').trim().split(/\s+/).filter(Boolean)
  return (words.length ? words.slice(0, 2).map((w) => w[0]).join('') : student.email[0]).toUpperCase()
}

const avatar = 'grid place-items-center rounded-full bg-muted font-semibold'

// The design's sticky top bar: logo, then (inside a Study Space) a breadcrumb with
// the Space switcher and the Space tabs, and the account menu on the right.
export function Header({ student, spaces, space }: { student: Student; spaces: Space[]; space?: Space }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Link to="/" aria-label="Jimmy, all Spaces">
          <Logo />
        </Link>
        {space && (
          <>
            <span className="text-muted-foreground" aria-hidden>
              /
            </span>
            <SpaceMenu spaces={spaces} space={space} />
            <SpaceTabs spaceId={space.id} />
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          <AccountMenu student={student} />
        </div>
      </div>
    </header>
  )
}

function SpaceMenu({ spaces, space }: { spaces: Space[]; space: Space }) {
  const { pathname } = useLocation()
  // Switching Space keeps you on the same tab.
  const tab = pathname.slice(`/spaces/${space.id}`.length)
  return (
    <DropdownMenu
      className="w-60"
      trigger={({ open, toggle }) => (
        <Button variant="ghost" size="sm" className="-ml-1 font-semibold" onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
          <span className="size-2.5 rounded-sm bg-space" aria-hidden />
          {space.name}
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      )}
    >
      {spaces.map((s) => (
        <MenuLink key={s.id} to={`/spaces/${s.id}${tab}`}>
          <span style={accentStyle(s.accent)} className="size-2.5 rounded-sm bg-space" aria-hidden />
          {s.name}
          {s.id === space.id && <Check className="ml-auto size-4" aria-hidden />}
        </MenuLink>
      ))}
      <MenuDivider />
      <MenuLink to="/">
        <LayoutGrid className="size-4" aria-hidden /> All Spaces
      </MenuLink>
    </DropdownMenu>
  )
}

function AccountMenu({ student }: { student: Student }) {
  const signOut = useSignOut()
  const name = student.display_name ?? student.email
  return (
    <DropdownMenu
      align="right"
      className="w-64"
      trigger={({ open, toggle }) => (
        <Button variant="ghost" size="sm" className="gap-2 pl-1.5" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={`Account menu: ${name}`}>
          <span className={`${avatar} size-7 text-xs`}>{initials(student)}</span>
          <span className="hidden sm:inline">{name}</span>
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      )}
    >
      <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Account</p>
      <div className="flex items-center gap-3 px-2 py-2 text-sm">
        <span className={`${avatar} size-8 text-xs`}>{initials(student)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{name}</span>
          {student.display_name && <span className="block truncate text-xs text-muted-foreground">{student.email}</span>}
        </span>
      </div>
      <MenuDivider />
      <MenuLink to="/settings">
        <Settings className="size-4" aria-hidden /> Settings
      </MenuLink>
      <MenuLink to="/developer">
        <Code className="size-4" aria-hidden /> Developer
      </MenuLink>
      <MenuDivider />
      <MenuButton onClick={() => signOut.mutate()} disabled={signOut.isPending}>
        <LogOut className="size-4" aria-hidden /> Sign out
      </MenuButton>
    </DropdownMenu>
  )
}
