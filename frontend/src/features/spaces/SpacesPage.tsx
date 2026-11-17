import { useRef, useState } from 'react'
import { ArrowRight, Book, Layers, Palette, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { ShowMore } from '@/components/ShowMore'
import { Button } from '@/components/ui/button'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { errorMessage } from '@/lib/http'
import { cardClass } from '@/lib/styles'
import { toast } from '@/lib/toast'
import { DeleteSpaceDialog } from './components/DeleteSpaceDialog'
import { RenameSpaceDialog } from './components/RenameSpaceDialog'
import { SpaceContextMenu } from './components/SpaceContextMenu'
import { SpaceFormDialog } from './components/SpaceFormDialog'
import { accentInfo, accentStyle } from './lib/accents'
import { createdLabel } from './lib/relativeTime'
import { useSpaces } from './queries/useSpaces'
import { useUpdateSpace } from './queries/useUpdateSpace'
import type { Space, SpaceCard as SpaceCardData } from './schemas/space'

type MenuState = { space: Space; x: number; y: number; returnTo: HTMLElement | null }
// A dialog keeps its Space while it fades out, and `n` gives each opening fresh fields.
type DialogState = { space: Space; open: boolean; n: number }

export function SpacesPage() {
  const student = useSignedInStudent()
  const query = useSpaces(student.id)
  const { error } = query
  const spaces = query.data?.spaces
  const update = useUpdateSpace(student.id)
  const [create, setCreate] = useState({ open: false, n: 0 })
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [renaming, setRenaming] = useState<DialogState | null>(null)
  const [deleting, setDeleting] = useState<DialogState | null>(null)
  const firstName = student.display_name?.trim().split(/\s+/)[0]
  const openCreate = () => setCreate((c) => ({ open: true, n: c.n + 1 }))

  function changeColour(space: Space, accent: Space['accent']) {
    update.mutate(
      { id: space.id, changes: { accent } },
      { onSuccess: () => toast(`${space.name} is now ${accentInfo(accent).label}`, Palette) },
    )
  }

  return (
    <section className="py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {firstName && <p className="text-sm text-muted-foreground">Good evening, {firstName}</p>}
          <h1 className="text-2xl font-semibold tracking-tight">Your Study Spaces</h1>
        </div>
        {spaces && spaces.length > 0 && (
          <Button onClick={openCreate}>
            <Plus /> New Space
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{errorMessage(error, 'Could not load your Study Spaces.')}</p>}
      {!spaces && !error && <Skeletons />}
      {spaces && spaces.length === 0 && <EmptyState onCreate={openCreate} />}
      {spaces && spaces.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} onMenu={(x, y, returnTo) => setMenu({ space, x, y, returnTo })} />
          ))}
          <li>
            <button
              type="button"
              onClick={openCreate}
              className="flex h-full min-h-[190px] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-input hover:bg-card"
            >
              <Plus className="size-5" aria-hidden /> New Space
            </button>
          </li>
        </ul>
      )}
      {spaces && spaces.length > 0 && (
        <ShowMore shown={spaces.length} total={query.data?.total ?? 0} hasMore={!!query.hasNextPage} loading={query.isFetchingNextPage} onMore={() => query.fetchNextPage()} />
      )}

      {menu && (
        <SpaceContextMenu
          key={`${menu.space.id}-${menu.x}-${menu.y}`}
          {...menu}
          onClose={() => setMenu(null)}
          onRename={() => setRenaming((r) => ({ space: menu.space, open: true, n: (r?.n ?? 0) + 1 }))}
          onDelete={() => setDeleting((d) => ({ space: menu.space, open: true, n: (d?.n ?? 0) + 1 }))}
          onColour={(accent) => changeColour(menu.space, accent)}
        />
      )}
      <SpaceFormDialog
        key={create.n}
        studentId={student.id}
        usedAccents={query.data?.accents ?? []}
        open={create.open}
        onClose={() => setCreate((c) => ({ ...c, open: false }))}
      />
      {renaming && (
        <RenameSpaceDialog
          key={renaming.n}
          studentId={student.id}
          space={renaming.space}
          open={renaming.open}
          onClose={() => setRenaming((r) => r && { ...r, open: false })}
        />
      )}
      {deleting && (
        <DeleteSpaceDialog
          key={deleting.n}
          studentId={student.id}
          space={deleting.space}
          open={deleting.open}
          onClose={() => setDeleting((d) => d && { ...d, open: false })}
          onDeleted={() => setDeleting((d) => d && { ...d, open: false })}
        />
      )}
    </section>
  )
}

const LONG_PRESS_MS = 520

function SpaceCard({ space, onMenu }: { space: SpaceCardData; onMenu: (x: number, y: number, returnTo: HTMLElement | null) => void }) {
  const link = useRef<HTMLAnchorElement>(null)
  const pressTimer = useRef<number | null>(null)
  const pressFired = useRef(false)
  const clearPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  return (
    // The menu opens by right-click, by a long press, or with the Menu key (Shift+F10).
    <li
      style={accentStyle(space.accent)}
      className="relative"
      onContextMenu={(e) => {
        // The dialogs are portalled out of the card but their events still bubble here.
        if (!e.currentTarget.contains(e.target as Node)) return
        e.preventDefault()
        onMenu(e.clientX, e.clientY, link.current)
      }}
      onKeyDown={(e) => {
        if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
          e.preventDefault()
          const box = (e.target as HTMLElement).getBoundingClientRect()
          onMenu(box.left + 16, box.top + 40, e.target as HTMLElement)
        }
      }}
      onTouchStart={(e) => {
        const touch = e.touches[0]
        pressFired.current = false
        pressTimer.current = window.setTimeout(() => {
          pressFired.current = true
          navigator.vibrate?.(10)
          onMenu(touch.clientX, touch.clientY, link.current)
        }, LONG_PRESS_MS)
      }}
      onTouchMove={clearPress}
      onTouchCancel={clearPress}
      onTouchEnd={(e) => {
        // A long press must not also follow the link.
        if (pressFired.current) e.preventDefault()
        clearPress()
      }}
    >
      <Link
        ref={link}
        to={`/spaces/${space.id}`}
        className={`group block h-full overflow-hidden transition-[translate,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-px hover:shadow-md ${cardClass}`}
      >
        <div className="h-1.5 bg-space" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{space.name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{space.course ?? 'No course set'}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-md bg-space-soft text-space-ink">
              <Book className="size-4" aria-hidden />
            </span>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Notes</dt>
              <dd className="font-semibold">{space.notes_count}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Flashcards</dt>
              <dd className="font-semibold">{space.flashcards_count}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Weak topics</dt>
              <dd className="font-semibold">{space.weak_topics_count}</dd>
            </div>
          </dl>
          <p className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            {createdLabel(space.created_at)}
            <span className="text-space-ink opacity-0 transition group-hover:opacity-100">
              Open <ArrowRight className="inline size-3.5" aria-hidden />
            </span>
          </p>
        </div>
      </Link>
    </li>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className={`mx-auto max-w-lg p-10 text-center ${cardClass}`}>
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted" aria-hidden>
        <Layers className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Start with one subject</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        A Study Space holds the notes for one subject. Jimmy only answers from what you put in it, plus clearly labelled
        extras.
      </p>
      <Button size="lg" className="mt-6" onClick={onCreate}>
        <Plus /> New Space
      </Button>
    </div>
  )
}

function Skeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading Spaces">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`p-5 ${cardClass}`}>
          <div className="skel h-4 w-1/2 rounded" />
          <div className="skel mt-2 h-3 w-3/4 rounded" />
          <div className="mt-6 flex gap-2">
            <div className="skel h-6 w-20 rounded-full" />
            <div className="skel h-6 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
