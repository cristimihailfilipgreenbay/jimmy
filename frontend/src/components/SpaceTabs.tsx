import { Link, useLocation } from 'react-router'
import { SPACE_TABS } from '@/lib/spaceTabs'
import { useSlidingIndicator } from '@/lib/useSlidingIndicator'
import { cn } from '@/lib/utils'

function useActiveTab(spaceId: string) {
  const { pathname } = useLocation()
  return SPACE_TABS.find((t) => pathname === `/spaces/${spaceId}${t.path}`)?.path
}

// Dashboard, Chat, Study and Flashcards of the current Study Space, in the header.
// A segmented control: equal-width tabs and a pill that slides behind the active
// one (a CSS transform), like the sign-in / sign-up tabs.
export function SpaceTabs({ spaceId }: { spaceId: string }) {
  const active = useActiveTab(spaceId)
  const index = Math.max(0, SPACE_TABS.findIndex((t) => t.path === active))
  return (
    <nav className="ml-3 hidden md:block" aria-label="Space">
      <ul className="relative grid grid-cols-4 rounded-lg bg-muted p-1">
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-md bg-card shadow-sm',
            'transition-transform duration-[280ms] ease-[cubic-bezier(.3,.7,.2,1)] motion-reduce:transition-none',
            active === undefined && 'opacity-0',
          )}
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {SPACE_TABS.map(({ path, label, Icon }) => {
          const on = active === path
          return (
            <li key={label} className="contents">
              <Link
                to={`/spaces/${spaceId}${path}`}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors duration-200',
                  on ? 'font-semibold text-space-ink' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// The same four tabs as a bar along the bottom of the screen on phones.
export function MobileSpaceNav({ spaceId }: { spaceId: string }) {
  const active = useActiveTab(spaceId)
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
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
