import { useState } from 'react'
import { Link } from 'react-router'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/http'
import { cn } from '@/lib/utils'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import type { Space } from './schemas/space'
import { CreateSpaceDialog } from './components/CreateSpaceDialog'
import { DeleteSpaceDialog } from './components/DeleteSpaceDialog'
import { useSpaces } from './queries/useSpaces'
import { swatchFor } from './lib/accents'

export function SpacesPage() {
  const student = useSignedInStudent()
  return <SpacesList studentId={student.id} />
}

function SpacesList({ studentId }: { studentId: string }) {
  const { data: spaces, error: loadError } = useSpaces(studentId)
  const error = loadError ? errorMessage(loadError, 'Could not load your Study Spaces.') : null
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

      <CreateSpaceDialog studentId={studentId} open={creating} onClose={() => setCreating(false)} />
      <DeleteSpaceDialog studentId={studentId} space={toDelete} onClose={() => setToDelete(null)} />
    </section>
  )
}
