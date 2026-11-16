import { BookOpen, Check, CircleHelp, FileText, Globe, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Citation, ConflictDecision, ConflictPayload } from '../schemas/chat'

export type ConflictCardState = { interruptId: string; payload: ConflictPayload; decision?: ConflictDecision }

const RESOLVED: Record<ConflictDecision, string> = {
  keep_notes: 'You kept your notes. Jimmy will use them, and mark this point as “disputed” in answers.',
  accept_other: 'You accepted the other source. Jimmy will use it, and say that your notes differ.',
  unsure: 'Marked unsure. Jimmy will show both versions whenever this comes up.',
}

const where = (c: Citation) => [c.author, c.page_or_section].filter(Boolean).join(' · ')

// A pause where Notes and another Source disagree: the Student chooses which to trust.
export function ConflictCard({ card, onDecide }: { card: ConflictCardState; onDecide: (interruptId: string, decision: ConflictDecision) => void }) {
  const { topic, notes, other } = card.payload
  const learned = other.source_type === 'learned'
  const otherName = learned ? 'Learned Material' : 'Subject Library'
  const otherShort = learned ? 'Learned Material' : 'the textbook'
  const id = `cf-${card.interruptId}`

  if (card.decision) {
    return (
      <div className="my-3 flex items-start gap-2 rounded-lg border border-border bg-muted/60 p-3 text-sm" role="status">
        <Check className="mt-0.5 size-4 flex-none text-success" aria-hidden />
        <div>
          <p className="font-medium">Resolved: {topic}</p>
          <p className="text-muted-foreground">{RESOLVED[card.decision]}</p>
        </div>
      </div>
    )
  }
  return (
    <section className="my-4 rounded-xl border border-space/30 bg-card p-4 shadow-sm" aria-labelledby={id} role="group">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-space-soft text-space-ink">
          <Scale className="size-4" aria-hidden />
        </span>
        <h3 id={id} className="text-sm font-semibold">
          Your notes and the {learned ? 'Learned Material' : 'textbook'} disagree
        </h3>
        <span className="ml-auto text-xs text-muted-foreground">Jimmy paused to ask you</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        About: <strong className="text-foreground">{topic}</strong>. Which should Jimmy trust from now on?
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <figure className="rounded-lg border border-notes/40 bg-notes-soft/50 p-3">
          <figcaption className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-notes uppercase">
            <FileText className="size-3.5" aria-hidden />
            Your notes
          </figcaption>
          <blockquote className="seg seg-notes my-0! text-base!">{notes.passage}</blockquote>
          <p className="mt-2 text-xs text-muted-foreground">
            {notes.document}
            {where(notes) && ` · ${where(notes)}`}
          </p>
        </figure>
        <figure className={cn('rounded-lg border p-3', learned ? 'border-web-line bg-web-soft/60' : 'border-lib/40 bg-lib-soft/50')}>
          <figcaption className={cn('mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase', learned ? 'text-web' : 'text-lib')}>
            {learned ? <Globe className="size-3.5" aria-hidden /> : <BookOpen className="size-3.5" aria-hidden />}
            {otherName}
          </figcaption>
          <blockquote className={cn('seg my-0! text-base!', learned ? 'seg-web' : 'seg-lib')}>{other.passage}</blockquote>
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-serif italic">{other.document}</span>
            {where(other) && ` · ${where(other)}`}
          </p>
        </figure>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onDecide(card.interruptId, 'keep_notes')}>
          <FileText /> Keep my notes
        </Button>
        <Button variant="space" size="sm" onClick={() => onDecide(card.interruptId, 'accept_other')}>
          {learned ? <Globe /> : <BookOpen />} Accept {otherShort}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDecide(card.interruptId, 'unsure')}>
          <CircleHelp /> Mark unsure
        </Button>
      </div>
    </section>
  )
}
