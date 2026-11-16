import { useState } from 'react'
import { ArrowRight, Book, Layers, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/http'
import { cardClass } from '@/lib/styles'
import { CreateSpaceDialog } from './components/CreateSpaceDialog'
import { accentStyle } from './lib/accents'
import { createdLabel } from './lib/relativeTime'
import { useSpaces } from './queries/useSpaces'
import type { Space } from './schemas/space'

// What each Study Space shows under its name. The features that own this data
// (Notes, Flashcards, Weak Topics) do not exist yet, so for now there is none.
const NO_STATS = { notes: 0, flashcards: 0, weak: 0 }

export function SpacesPage() {
  const student = useSignedInStudent()
  const { data: spaces, error } = useSpaces(student.id)
  const [creating, setCreating] = useState(false)
  const firstName = student.display_name?.trim().split(/\s+/)[0]

  return (
    <section className="py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {firstName && <p className="text-sm text-muted-foreground">Good evening, {firstName}</p>}
          <h1 className="text-2xl font-semibold tracking-tight">Your Study Spaces</h1>
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
            <SpaceCard key={space.id} space={space} />
          ))}
          <li>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex h-full min-h-[190px] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-input hover:bg-card"
            >
              <Plus className="size-5" aria-hidden /> New Space
            </button>
          </li>
        </ul>
      )}

      <CreateSpaceDialog studentId={student.id} open={creating} onClose={() => setCreating(false)} />
    </section>
  )
}

function SpaceCard({ space }: { space: Space }) {
  return (
    <li style={accentStyle(space.accent)}>
      <Link
        to={`/spaces/${space.id}`}
        className={`group block h-full overflow-hidden transition hover:-translate-y-px hover:shadow-md ${cardClass}`}
      >
        <div className="h-1.5 bg-space" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight">{space.name}</h2>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{space.course ?? 'No course set'}</p>
            </div>
            <span className="grid size-9 flex-none place-items-center rounded-md bg-space-soft text-space-ink">
              <Book className="size-4" aria-hidden />
            </span>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Notes</dt>
              <dd className="font-semibold">{NO_STATS.notes}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Flashcards</dt>
              <dd className="font-semibold">{NO_STATS.flashcards}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Weak topics</dt>
              <dd className="font-semibold">{NO_STATS.weak}</dd>
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
