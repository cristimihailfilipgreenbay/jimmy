import { useState } from 'react'
import { Check, CircleCheck, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CitationChip } from '@/features/chat/components/CitationChip'
import { errorMessage } from '@/lib/http'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import type { CardDecision, Draft } from '../schemas/flashcards'

const origin = (type: string) => (type === 'library' ? 'From the Subject Library' : type === 'notes' ? 'From your notes' : 'From Learned Material')

// Drafts wait here. Nothing joins the deck until the Student approves it, edits it or
// rejects it.
export function ReviewQueue({
  drafts,
  deciding,
  error,
  onDecide,
}: {
  drafts: Draft[]
  deciding: boolean
  error: unknown
  onDecide: (draft: Draft, decision: CardDecision) => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  if (!drafts.length) {
    return (
      <div className={`${cardClass} px-6 py-12 text-center`}>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-muted">
          <CircleCheck className="size-5" aria-hidden />
        </span>
        <p className="mt-3 font-semibold">All caught up</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">No drafts waiting. New ones appear after you ask Jimmy for flashcards in a chat.</p>
      </div>
    )
  }
  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">Drafts never enter your deck until you approve them.</p>
      {error != null && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {errorMessage(error, 'Could not save that. Try again.')}
        </p>
      )}
      <ul role="list" className="space-y-4">
        {drafts.map((d) => (
          <li key={d.id} className={cn(cardClass, 'p-5')}>
            {editing === d.id ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = new FormData(e.currentTarget)
                  const front = String(form.get('front')).trim()
                  const back = String(form.get('back')).trim()
                  if (!front || !back) return
                  setEditing(null)
                  onDecide(d, { id: d.id, action: 'edit', front, back })
                }}
              >
                <div>
                  <label className="mb-1 block text-xs font-medium" htmlFor={`ef-${d.id}`}>
                    Front
                  </label>
                  <Input id={`ef-${d.id}`} name="front" defaultValue={d.front} required autoFocus />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" htmlFor={`eb-${d.id}`}>
                    Back
                  </label>
                  <textarea id={`eb-${d.id}`} name="back" rows={2} defaultValue={d.back} required className="w-full rounded-md border border-input bg-card p-2 text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button variant="space" size="sm" type="submit" disabled={deciding}>
                    <Check /> Save &amp; approve
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Front</p>
                      <p className="mt-1 font-serif text-lg leading-snug">{d.front}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Back</p>
                      <p className="mt-1 font-serif text-lg leading-snug">{d.back}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">{origin(d.source.source_type)}</span>
                  <CitationChip citation={{ id: 1, ...d.source }} />
                  <div className="ml-auto flex gap-2">
                    <Button variant="space" size="sm" disabled={deciding} onClick={() => onDecide(d, { id: d.id, action: 'approve' })}>
                      <Check /> Approve
                    </Button>
                    <Button variant="outline" size="sm" disabled={deciding} onClick={() => setEditing(d.id)}>
                      <Pencil /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" disabled={deciding} onClick={() => onDecide(d, { id: d.id, action: 'reject' })}>
                      <X /> Reject
                    </Button>
                  </div>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
