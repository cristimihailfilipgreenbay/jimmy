import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Trash2 } from 'lucide-react'
import { useStudent } from '@/hooks/student'
import { ACCENTS, swatchFor } from '@/lib/accents'
import { ApiError, type Accent, type Space } from '@/lib/api'
import { useCreateSpace, useDeleteSpace, useSpaces } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const message = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback)

export function SpacesPage() {
  const { current, loading } = useStudent()
  if (loading) return null
  if (!current) {
    return (
      <section>
        <h2 className="text-2xl font-semibold">Study Spaces</h2>
        <p className="mt-4 text-muted-foreground">Choose or create a profile in the sidebar to see your Study Spaces.</p>
      </section>
    )
  }
  return <SpacesList studentId={current.id} />
}

function SpacesList({ studentId }: { studentId: string }) {
  const { data: spaces, error: loadError } = useSpaces(studentId)
  const error = loadError ? message(loadError, 'Could not load your Study Spaces.') : null
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<Space | null>(null)

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Study Spaces</h2>
        <Button onClick={() => setCreating(true)}>New Study Space</Button>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {spaces && spaces.length === 0 && (
        <p className="mt-6 text-muted-foreground">No Study Spaces yet. Create one for a subject you are studying.</p>
      )}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {spaces?.map((space) => (
          <li key={space.id} className="flex items-center gap-3 rounded-xl border p-4">
            <span className={cn('size-3 flex-none rounded-full', swatchFor(space.accent))} aria-hidden />
            <Link to={`/spaces/${space.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
              {space.name}
            </Link>
            <Button variant="ghost" size="icon" aria-label={`Delete ${space.name}`} onClick={() => setToDelete(space)}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>

      <CreateDialog studentId={studentId} open={creating} onClose={() => setCreating(false)} />
      <DeleteDialog studentId={studentId} space={toDelete} onClose={() => setToDelete(null)} />
    </section>
  )
}

function CreateDialog({ studentId, open, onClose }: { studentId: string; open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [accent, setAccent] = useState<Accent>('slate')
  const create = useCreateSpace(studentId)
  const error = create.error ? message(create.error, 'Could not create the Study Space.') : null

  function close() {
    create.reset()
    onClose()
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate(
      { name, accent },
      {
        onSuccess: () => {
          setName('')
          setAccent('slate')
          close()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New Study Space</DialogTitle>
            <DialogDescription>One Study Space per subject keeps your Notes and answers separate.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="Study Space name"
            placeholder="e.g. Biology"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-2 text-sm text-muted-foreground">Accent colour</legend>
            {ACCENTS.map((a) => (
              <label
                key={a.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1 text-sm',
                  accent === a.value && 'border-foreground font-medium',
                )}
              >
                <input
                  type="radio"
                  name="accent"
                  className="sr-only"
                  checked={accent === a.value}
                  onChange={() => setAccent(a.value)}
                />
                <span className={cn('size-3 rounded-full', a.swatch)} aria-hidden />
                {a.label}
              </label>
            ))}
          </fieldset>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({ studentId, space, onClose }: { studentId: string; space: Space | null; onClose: () => void }) {
  const remove = useDeleteSpace(studentId)
  const error = remove.error ? message(remove.error, 'Could not delete the Study Space.') : null

  function close() {
    remove.reset()
    onClose()
  }

  function confirm() {
    if (space) remove.mutate(space.id, { onSuccess: close })
  }

  return (
    <Dialog open={space !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{space?.name}”?</DialogTitle>
          <DialogDescription>
            This permanently deletes the Study Space and everything in it: Notes, Topics, conversations, Flashcards and
            Learned Material. It cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={remove.isPending} onClick={confirm}>
            Delete Study Space
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
