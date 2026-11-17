import { useLayoutEffect, useRef, useState } from 'react'
import { Book, ChevronDown, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { DropdownMenu } from '@/components/DropdownMenu'
import { ShowMore } from '@/components/ShowMore'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { WhenDisabled } from '@/components/WhenDisabled'
import type { Space } from '@/features/spaces/schemas/space'
import { errorMessage } from '@/lib/http'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useBooks } from '../queries/useBooks'
import { useLibrary } from '../queries/useLibrary'
import { useSwitchLibrary } from '../queries/useSwitchLibrary'
import type { LibraryState } from '../schemas/library'
import { PackDialog } from './PackDialog'

// The bookshelf, drawn as in the design; it turns the Library's brown when the Library is on.
function Shelf({ on }: { on: boolean }) {
  return (
    <svg className={cn('size-6 transition-colors duration-300', on ? 'text-lib' : 'text-muted-foreground/50')} viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="6" width="4" height="13" rx="1" fill="currentColor" />
      <rect x="8.2" y="3.5" width="4" height="15.5" rx="1" fill="currentColor" opacity=".72" />
      <path d="M14.2 7.4l3.6-1 3.3 12.4-3.6 1z" fill="currentColor" opacity=".5" />
      <rect x="2" y="19.6" width="20" height="1.6" rx=".8" fill="currentColor" opacity=".9" />
    </svg>
  )
}

function statusText(state: LibraryState | undefined): string {
  if (!state || state.status === 'none') return 'No textbooks yet'
  if (state.status === 'indexing') {
    return `Indexing ${state.chapters_ready} of ${state.chapters_total} chapters…`
  }
  if (state.status === 'failed') return 'Indexing failed · add it again'
  const n = state.book_count
  return state.enabled ? `${n} textbook${n === 1 ? '' : 's'} searched` : 'Off · answers use your notes only'
}

// The textbooks on the shelf, twenty at a time: many scroll inside the menu instead of making it
// taller than the screen, and "Show more" loads the next twenty.
function ShelfList({ studentId, spaceId, on, indexing }: { studentId: string; spaceId: string; on: boolean; indexing: boolean }) {
  const query = useBooks(studentId, spaceId, indexing)
  const books = query.data?.books ?? []
  return (
    <ScrollArea className="max-h-72 [&>[data-slot=scroll-area-viewport]]:max-h-72">
      <ul className="p-1.5">
        {books.map((book) => (
          <li key={book.pack.id} className={cn('flex items-start gap-3 rounded-md p-2', !on && 'opacity-60')}>
            <span className="mt-0.5 h-10 w-1.5 flex-none rounded-full bg-lib" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[15px] leading-snug italic">{book.pack.title}</span>
              <span className="block text-xs text-muted-foreground">
                {book.pack.author} · {book.pack.license} · ch. {book.chapters.join(', ')}
              </span>
              <span className="block text-xs text-muted-foreground">
                {book.status === 'indexing'
                  ? `Indexing ${book.chapters_ready} of ${book.chapters_total} chapters…`
                  : book.status === 'failed'
                    ? 'Indexing failed · add it again'
                    : `Cited in ${book.cited_in_answers} answer${book.cited_in_answers === 1 ? '' : 's'}`}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="px-2 pb-2">
        <ShowMore shown={books.length} total={query.data?.total ?? 0} hasMore={!!query.hasNextPage} loading={query.isFetchingNextPage} onMore={() => query.fetchNextPage()} />
      </div>
    </ScrollArea>
  )
}

// The Subject Library card in a Study Space's header: a switch to use the Library in this
// Space, and a menu with the textbook on the shelf.
export function LibraryCard({ studentId, space }: { studentId: string; space: Space }) {
  const { data: state } = useLibrary(studentId, space.id)
  const set = useSwitchLibrary(studentId, space.id)
  const [choosing, setChoosing] = useState(false)
  // The Chat's "Add a textbook" tile links here with ?library=open.
  const [params, setParams] = useSearchParams()
  const [startOpen] = useState(params.get('library') === 'open')
  useLayoutEffect(() => {
    if (params.get('library')) setParams((p) => (p.delete('library'), p), { replace: true })
  }, [params, setParams])

  const attached = !!state && state.status !== 'none'
  const on = attached && state.enabled
  const status = statusText(state)

  // The card grows or shrinks to its new text over 340ms, as in the design.
  const box = useRef<HTMLDivElement>(null)
  const width = useRef<number | null>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const next = el.getBoundingClientRect().width
    const before = width.current
    width.current = next
    if (before === null || Math.abs(next - before) < 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.style.overflow = 'hidden'
    el.animate([{ width: `${before}px` }, { width: `${next}px` }], {
      duration: 340,
      easing: 'cubic-bezier(.2,.7,.2,1)',
    }).finished.then(
      () => (el.style.overflow = ''),
      () => (el.style.overflow = ''),
    )
  }, [status])

  function toggle(enabled: boolean) {
    set.mutate(enabled, {
      onSuccess: () => toast(`Subject Library ${enabled ? 'on' : 'off'} for ${space.name}`, Book),
      onError: (err) => toast(errorMessage(err, 'Could not change the Subject Library.')),
    })
  }

  return (
    <>
      <DropdownMenu
        align="right"
        defaultOpen={startOpen}
        className="top-[calc(100%+6px)] z-30 w-[min(360px,calc(100vw-32px))] p-0"
        trigger={({ open, toggle: toggleMenu }) => (
          <div ref={box} className="flex items-center gap-2 rounded-xl bg-muted py-1 pr-3 pl-1">
            <button
              type="button"
              onClick={toggleMenu}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-describedby="lib-desc"
              className="flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-left hover:bg-card"
            >
              <Shelf on={on} />
              <span>
                <span className="block text-sm leading-tight font-semibold">Subject Library</span>
                <span
                  id="lib-desc"
                  key={status}
                  className={cn('fade-in block text-xs whitespace-nowrap transition-colors duration-300', on ? 'text-lib' : 'text-muted-foreground')}
                >
                  {status}
                </span>
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
            </button>
            <WhenDisabled disabled={!attached} reason="Add a textbook first.">
              <Switch
                checked={on}
                disabled={!attached || set.isPending}
                onCheckedChange={toggle}
                aria-label="Use Subject Library in this Space"
                className="disabled:opacity-50"
              />
            </WhenDisabled>
          </div>
        )}
      >
        <div className="border-b p-3">
          <p className="text-sm font-semibold">On the shelf · {space.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reviewed textbooks Jimmy may quote. Answers from them get the{' '}
            <span className="chip chip-lib ml-0 !py-0 !text-[11px]">
              <Book className="size-3" aria-hidden />
              Library
            </span>{' '}
            label.
          </p>
        </div>
        {attached ? (
          <ShelfList studentId={studentId} spaceId={space.id} on={on} indexing={state.status === 'indexing'} />
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            No textbooks in this Space yet. Approved web material and textbooks you add will appear here.
          </p>
        )}
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <span className="px-1 text-xs text-muted-foreground">{on ? 'Searched in every answer' : 'Switched off for this Space'}</span>
          <Button variant="ghost" size="sm" role="menuitem" onClick={() => setChoosing(true)}>
            <Plus /> Add textbook
          </Button>
        </div>
      </DropdownMenu>
      <PackDialog studentId={studentId} space={space} state={state} open={choosing} onClose={() => setChoosing(false)} />
    </>
  )
}
