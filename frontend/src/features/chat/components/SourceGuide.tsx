import { Book, File, Lightbulb, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Space } from '@/features/spaces/schemas/space'

const card = 'rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(20,20,30,.04)]'

const SOURCES: { chip: ReactNode; desc: string }[] = [
  {
    chip: (
      <span className="chip chip-notes ml-0">
        <File className="size-3.5" aria-hidden />
        Lecture 4 notes, p. 12
      </span>
    ),
    desc: 'From a document you uploaded. Cited with document, author and page.',
  },
  {
    chip: (
      <span className="chip chip-lib ml-0">
        <Book className="size-3.5" aria-hidden />
        Hartmann &amp; Ode, ch. 8, p. 215
      </span>
    ),
    desc: 'From a reviewed textbook in this Space’s Subject Library. Cited like a book.',
  },
  {
    chip: (
      <span className="chip chip-web ml-0">
        <TriangleAlert className="size-3.5" aria-hidden />
        Unreviewed web · site.org
      </span>
    ),
    desc: 'Found on the web and not yet reviewed by you. Double-check before relying on it.',
  },
  {
    chip: (
      <span className="chip chip-tutor ml-0">
        <Lightbulb className="size-3.5" aria-hidden />
        Tutor knowledge
      </span>
    ),
    desc: 'Jimmy’s general knowledge. Not from your notes and has no citation.',
  },
]

export function SourceGuide({ space }: { space: Space }) {
  // Notes search is always on; the Subject Library follows the Space's switch; web search comes with its feature.
  return (
    <aside className="hidden lg:block" aria-label="Source guide">
      <div className="sticky top-20 space-y-4">
        <div className={`${card} p-4`}>
          <h2 className="text-sm font-semibold">How to read sources</h2>
          <ul className="mt-3 space-y-3">
            {SOURCES.map((s, i) => (
              <li key={i} className="flex flex-col items-start gap-1.5">
                {s.chip}
                <span className="text-xs text-muted-foreground">{s.desc}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Each kind also has its own line on the left of the sentence: solid, double, dashed or dotted.
          </p>
        </div>
        <div className={`${card} p-4 text-sm`}>
          <h2 className="text-sm font-semibold">This Space</h2>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li className="flex justify-between">
              Notes searched <span>Yes</span>
            </li>
            <li className="flex justify-between">
              Subject Library <span>{space.library_enabled ? 'On' : 'Off'}</span>
            </li>
            <li className="flex justify-between">
              Web search <span>Off</span>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  )
}
