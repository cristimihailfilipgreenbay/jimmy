import { Check, CircleHelp, FileText, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isWeb } from '@/features/chat/lib/segments'
import { cn } from '@/lib/utils'
import type { Dispute, DisputeDecision } from '../schemas/study'

// A pause where the grader is unsure: the Student's answer beside the source passage, and
// the Student decides whether the answer was right.
export function DisputeCard({ dispute, deciding, onDecide }: { dispute: Dispute; deciding: boolean; onDecide: (decision: DisputeDecision) => void }) {
  const { source } = dispute
  const web = isWeb(source)
  const library = source.source_type === 'library'
  const id = `dp-${dispute.question_id}`
  const where = [source.document, source.author, source.page_or_section].filter(Boolean).join(' · ')
  return (
    <section className="fade-in mt-5 rounded-xl border border-space/30 bg-card p-4 shadow-sm" role="group" aria-labelledby={id}>
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-space-soft text-space-ink">
          <CircleHelp className="size-4" aria-hidden />
        </span>
        <h2 id={id} className="text-sm font-semibold">
          Jimmy isn’t sure how to mark this
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Compare your answer with the source passage and decide.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <figure className="rounded-lg border border-border bg-muted/50 p-3">
          <figcaption className="mb-1.5 flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <User className="size-3.5" aria-hidden /> Your answer
          </figcaption>
          <p className="text-[15px]">{dispute.answer}</p>
        </figure>
        <figure className={cn('rounded-lg border p-3', web ? 'border-web-line bg-web-soft/60' : library ? 'border-lib/40 bg-lib-soft/50' : 'border-notes/40 bg-notes-soft/50')}>
          <figcaption className={cn('mb-1.5 flex flex-wrap items-center gap-1 text-xs font-semibold tracking-wide uppercase', web ? 'text-web' : library ? 'text-lib' : 'text-notes')}>
            <FileText className="size-3.5" aria-hidden /> Source passage
          </figcaption>
          <blockquote className={cn('seg my-0! text-[15px]!', web ? 'seg-web' : library ? 'seg-lib' : 'seg-notes')}>{source.passage}</blockquote>
          <p className="mt-1.5 text-xs text-muted-foreground">{where}</p>
        </figure>
      </div>
      <p className="mt-4 text-sm font-medium" id={`${id}-q`}>
        Was your answer correct?
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-q`}>
        <Button variant="space" size="sm" disabled={deciding} onClick={() => onDecide('correct')}>
          <Check /> Yes, count it
        </Button>
        <Button variant="outline" size="sm" disabled={deciding} onClick={() => onDecide('incorrect')}>
          <X /> No, mark it wrong
        </Button>
        <Button variant="ghost" size="sm" disabled={deciding} onClick={() => onDecide('unsure')}>
          <CircleHelp /> Not sure, review later
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Your decision updates Weak topics.</p>
    </section>
  )
}
