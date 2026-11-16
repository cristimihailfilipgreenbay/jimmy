import { Book, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { accentInfo } from '@/features/spaces/lib/accents'
import type { Space } from '@/features/spaces/schemas/space'

export function DoneStep({ spaces, onFinish }: { spaces: Space[]; onFinish: (to: 'notes' | 'spaces') => void }) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold tracking-tight">Your Spaces are ready</h2>
      <p className="mt-1 text-sm text-muted-foreground">Next step: add lecture notes, so Jimmy has something to cite.</p>
      <ul className="mt-6 grid gap-2.5 text-left sm:grid-cols-2">
        {spaces.map((space, i) => {
          const accent = accentInfo(space.accent)
          return (
            <li key={space.id} className="ob-pop rounded-xl border bg-card p-3" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <div className="flex items-center gap-3">
                <span className="grid size-9 flex-none place-items-center rounded-lg text-white" style={{ backgroundColor: accent.color }} aria-hidden>
                  <Book className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{space.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{space.course ?? 'No notes yet'}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={() => onFinish('notes')}>
          <Upload /> Add notes to {spaces[0]?.name ?? 'my first Space'}
        </Button>
        <Button size="lg" variant="outline" onClick={() => onFinish('spaces')}>
          Go to my Spaces
        </Button>
      </div>
    </div>
  )
}
