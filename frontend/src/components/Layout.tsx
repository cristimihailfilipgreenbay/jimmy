import { useState } from 'react'
import { Outlet, useLocation, useParams } from 'react-router'
import { Header } from '@/components/Header'
import { MobileSpaceNav } from '@/components/SpaceTabs'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { accentStyle } from '@/features/spaces/lib/accents'
import { spaceTabIndex, tabDirection } from '@/lib/spaceTabs'
import { cn } from '@/lib/utils'
import { useSpaces } from '@/features/spaces/queries/useSpaces'

// The app shell from the design: a top header, and the screen below it. Inside a
// Study Space the whole screen takes that Space's colour.
export function Layout() {
  const { spaceId } = useParams()
  const { pathname } = useLocation()
  const student = useSignedInStudent()
  const { data: spaces = [] } = useSpaces(student.id)
  const space = spaceId ? spaces.find((s) => s.id === spaceId) : undefined

  // Moving between a Space's tabs slides the screen towards the tab (Dashboard < Chat < Study <
  // Flashcards); every other change fades it up. Adjusting state while rendering is the React
  // way to compare with the previous tab.
  const tab = spaceId ? spaceTabIndex(pathname, spaceId) : -1
  const [motion, setMotion] = useState<{ spaceId?: string; tab: number; dir: 'next' | 'prev' | null }>({ spaceId, tab, dir: null })
  if (motion.spaceId !== spaceId || motion.tab !== tab) setMotion({ spaceId, tab, dir: tabDirection(motion, { spaceId, tab }) })

  return (
    <div style={space ? accentStyle(space.accent) : undefined}>
      <a href="#main" className="skip rounded-md bg-primary px-3 py-2 text-sm text-white">
        Skip to content
      </a>
      <Header student={student} spaces={spaces} space={space} />
      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-28 outline-none">
        {/* Remounted on every route change so each screen animates in as it arrives. */}
        <div key={pathname} className={cn('overflow-x-clip', motion.dir ? `tab-${motion.dir}` : 'page-in')}>
          <Outlet />
        </div>
      </main>
      {space && <MobileSpaceNav spaceId={space.id} />}
    </div>
  )
}
