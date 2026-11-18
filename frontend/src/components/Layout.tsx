import { useLayoutEffect, useState } from 'react'
import { Outlet, useLocation, useParams } from 'react-router'
import { Header } from '@/components/Header'
import { MobileSpaceNav } from '@/components/SpaceTabs'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { accentStyle } from '@/features/spaces/lib/accents'
import { spaceTabIndex, tabDirection } from '@/lib/spaceTabs'
import { cn } from '@/lib/utils'
import { useSpace } from '@/features/spaces/queries/useSpace'
import { useSpaces } from '@/features/spaces/queries/useSpaces'

// The app shell from the design: a top header, and the screen below it. Inside a
// Study Space the whole screen takes that Space's colour.
export function Layout() {
  const { spaceId } = useParams()
  const { pathname } = useLocation()
  // The chat keeps its composer at the bottom of the screen, so it needs no room below it
  // (on a phone, only the space for the bottom bar).
  const chat = pathname.endsWith('/chat')
  // A new screen opens at its top, not where the last one was scrolled to (the chat sits at the
  // bottom). The chat then scrolls to its latest message itself, in a later effect.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  const student = useSignedInStudent()
  const { data: all } = useSpaces(student.id)
  const spaces = all?.spaces ?? []
  const { data: space } = useSpace(student.id, spaceId)

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
      <main id="main" tabIndex={-1} className={cn('mx-auto max-w-7xl px-4 outline-none', chat ? 'pb-0 max-md:pb-16' : 'pb-28')}>
        {/* Remounted on every route change so each screen animates in as it arrives. */}
        <div key={pathname} className={cn('overflow-x-clip', motion.dir ? `tab-${motion.dir}` : 'page-in')}>
          <Outlet />
        </div>
      </main>
      {space && <MobileSpaceNav spaceId={space.id} />}
    </div>
  )
}
