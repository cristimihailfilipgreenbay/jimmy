import { Link, useLocation } from 'react-router'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { useDrafts } from '@/features/flashcards/queries/useFlashcards'
import { SPACE_TABS } from '@/lib/spaceTabs'
import { useSlidingIndicator } from '@/lib/useSlidingIndicator'
import { cn } from '@/lib/utils'

function useActiveTab(spaceId: string) {
  const { pathname } = useLocation()
  return SPACE_TABS.find((t) => pathname === `/spaces/${spaceId}${t.path}`)?.path
}

// Flashcard drafts waiting for review, shown on the Flashcards tab (0 shows nothing).
function useDraftCount(spaceId: string) {
  const student = useSignedInStudent()
  return useDrafts(student.id, spaceId).data?.total ?? 0
}

// Dashboard, Chat, Study and Flashcards of the current Study Space, in the header.
export function SpaceTabs({ spaceId }: { spaceId: string }) {
  const active = useActiveTab(spaceId)
  const drafts = useDraftCount(spaceId)
  const { container, indicator } = useSlidingIndicator<HTMLDivElement>(active ?? '')
  return (
    <nav className="ml-3 hidden md:block" aria-label="Space">
      <div ref={container} className="relative rounded-xl border bg-muted p-1">
        <span ref={indicator} aria-hidden className="pointer-events-none absolute top-0 left-0 rounded-lg bg-space/13" />
        <ul className="relative flex items-center gap-0.5">
          {SPACE_TABS.map(({ path, label, Icon }) => {
            const on = active === path
            return (
              <li key={label}>
                <Link
                  to={`/spaces/${spaceId}${path}`}
                  aria-current={on ? 'page' : undefined}
                  data-ind-target
                  data-active={on}
                  className={cn(
                    'relative flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
                    on ? 'font-semibold text-space-ink/80' : 'text-muted-foreground hover:bg-card/70 hover:text-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                  {path === '/flashcards' && drafts > 0 && (
                    <span
                      className={cn('grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-semibold', on ? 'bg-space text-white' : 'bg-border text-foreground')}
                      aria-label={`${drafts} drafts to review`}
                    >
                      {drafts}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

// The same four tabs as a bar along the bottom of the screen on phones.
export function MobileSpaceNav({ spaceId }: { spaceId: string }) {
  const active = useActiveTab(spaceId)
  const drafts = useDraftCount(spaceId)
  const { container, indicator } = useSlidingIndicator<HTMLElement>(active ?? '')
  return (
    <nav ref={container} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card md:hidden" aria-label="Space">
      <span ref={indicator} aria-hidden className="pointer-events-none absolute top-0 left-0 rounded-full bg-space/13" />
      {SPACE_TABS.map(({ path, label, Icon }) => {
        const on = active === path
        return (
          <Link
            key={label}
            to={`/spaces/${spaceId}${path}`}
            aria-current={on ? 'page' : undefined}
            className={cn('relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px]', on ? 'font-semibold text-space-ink/80' : 'text-muted-foreground')}
          >
            <span data-ind-target data-active={on} className="relative grid h-8 w-14 place-items-center rounded-full">
              <Icon className="size-5" aria-hidden />
              {path === '/flashcards' && drafts > 0 && (
                <span className="absolute -top-1 -right-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-space px-1 text-[10px] text-white" aria-label={`${drafts} drafts to review`}>
                  {drafts}
                </span>
              )}
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
