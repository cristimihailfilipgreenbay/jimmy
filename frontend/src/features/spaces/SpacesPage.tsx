import { useState } from 'react'
import { Link } from 'react-router'
import { Book, Layers, Plus, Trash2 } from 'lucide-react'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/http'
import { CreateSpaceDialog } from './components/CreateSpaceDialog'
import { DeleteSpaceDialog } from './components/DeleteSpaceDialog'
import { accentInfo } from './lib/accents'
import { useSpaces } from './queries/useSpaces'
import type { Space } from './schemas/space'

const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export function SpacesPage() {
  const student = useSignedInStudent()
  const { data: spaces, error } = useSpaces(student.id)
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<Space | null>(null)
  const firstName = student.display_name?.trim().split(/\s+/)[0]

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {firstName && (
            <p className="text-sm text-muted-foreground">
              {greeting()}, {firstName}
            </p>
          )}
          <h2 className="text-2xl font-semibold tracking-tight">Your Study Spaces</h2>
        </div>
        {spaces && spaces.length > 0 && (
          <Button onClick={() => setCreating(true)}>
            <Plus /> New Space
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{errorMessage(error, 'Could not load your Study Spaces.')}</p>}
      {!spaces && !error && <Skeletons />}
      {spaces && spaces.length === 0 && <EmptyState onCreate={() => setCreating(true)} />}
      {spaces && spaces.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} onDelete={() => setToDelete(space)} />
          ))}
          <li>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex h-full min-h-[190px] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm font-medium text-muted-foreground hover:border-input hover:bg-card"
            >
              <Plus className="size-5" aria-hidden /> New Space
            </button>
          </li>
        </ul>
      )}

      <CreateSpaceDialog studentId={student.id} open={creating} onClose={() => setCreating(false)} />
      <DeleteSpaceDialog studentId={student.id} space={toDelete} onClose={() => setToDelete(null)} />
    </section>
  )
}

function SpaceCard({ space, onDelete }: { space: Space; onDelete: () => void }) {
  const accent = accentInfo(space.accent)
  const created = new Date(space.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <li className="group relative">
      <Link
        to={`/spaces/${space.id}`}
        className="block h-full overflow-hidden rounded-lg border bg-card transition hover:-translate-y-px hover:shadow-md"
      >
        <div className="h-1.5" style={{ backgroundColor: accent.color }} aria-hidden />
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold tracking-tight">{space.name}</h3>
              {space.course && <p className="mt-0.5 truncate text-sm text-muted-foreground">{space.course}</p>}
            </div>
            <span className="grid size-9 flex-none place-items-center rounded-md" style={{ backgroundColor: accent.soft, color: accent.ink }} aria-hidden>
              <Book className="size-4" />
            </span>
          </div>
          <p className="mt-10 border-t pt-3 pr-9 text-xs text-muted-foreground">Created {created}</p>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${space.name}`}
        onClick={onDelete}
        className="absolute right-3 bottom-2 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 />
      </Button>
    </li>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border bg-card p-10 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted" aria-hidden>
        <Layers className="size-6" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">Start with one subject</h3>
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
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading Study Spaces">
      {[1, 2, 3].map((i) => (
        <li key={i} className="rounded-lg border bg-card p-5">
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-6 flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  )
}
