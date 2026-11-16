import { Outlet, useLocation, useParams } from 'react-router'
import { Header } from '@/components/Header'
import { MobileSpaceNav } from '@/components/SpaceTabs'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { accentStyle } from '@/features/spaces/lib/accents'
import { useSpaces } from '@/features/spaces/queries/useSpaces'

// The app shell from the design: a top header, and the screen below it. Inside a
// Study Space the whole screen takes that Space's colour.
export function Layout() {
  const { spaceId } = useParams()
  const { pathname } = useLocation()
  const student = useSignedInStudent()
  const { data: spaces = [] } = useSpaces(student.id)
  const space = spaceId ? spaces.find((s) => s.id === spaceId) : undefined

  return (
    <div style={space ? accentStyle(space.accent) : undefined}>
      <a href="#main" className="skip rounded-md bg-primary px-3 py-2 text-sm text-white">
        Skip to content
      </a>
      <Header student={student} spaces={spaces} space={space} />
      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-28 outline-none">
        {/* Remounted on every route change so each screen fades up as it arrives. */}
        <div key={pathname} className="page-in">
          <Outlet />
        </div>
      </main>
      {space && <MobileSpaceNav spaceId={space.id} />}
    </div>
  )
}
