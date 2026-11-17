import { useState } from 'react'
import { Check, ThumbsDown, ThumbsUp } from 'lucide-react'
import { JimmyBadge } from '@/components/JimmyBadge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCost } from '@/features/developer/lib/cost'
import { toast } from '@/lib/toast'
import { DOWN_REASONS, type Citation, type Rating } from '../schemas/chat'
import { ConflictCard, type ConflictCardState } from './ConflictCard'
import { Segments } from './Segments'
import type { ConflictDecision } from '../schemas/chat'

export type ToolPill = { label: string; meta?: string }

export function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md border border-space/20 bg-space/10 px-4 py-2.5 text-[15px] font-medium text-space-ink whitespace-pre-wrap">{text}</div>
    </div>
  )
}

export function AnswerMessage({
  content,
  citations,
  tools = [],
  spaceId = '',
  conflicts = [],
  onDecide,
  streaming = false,
  status,
  rated = { rating: null, comment: null },
  onRate,
  usage,
}: {
  content: string
  citations: Citation[]
  tools?: ToolPill[]
  spaceId?: string
  conflicts?: ConflictCardState[]
  onDecide?: (interruptId: string, decision: ConflictDecision) => void
  streaming?: boolean
  // What Jimmy is doing while the answer streams, shown beside the avatar.
  status?: { label: string; working: boolean }
  // The Student's stored 👍/👎 on this answer, and why. `onRate(null)` takes it back.
  rated?: { rating: Rating | null; comment: string | null }
  onRate?: (rating: Rating | null, comment?: string) => Promise<unknown>
  // Tokens and estimated cost, shown when the Developer settings ask for it.
  usage?: { tokensIn: number; tokensOut: number; costUsd: number | null }
}) {
  // Shown at once; put back if the rating could not be saved.
  const [mine, setMine] = useState(rated)
  const rating = mine.rating
  const rate = (next: Rating | null, comment: string | null = null) => {
    const before = mine
    setMine({ rating: next, comment })
    onRate?.(next, comment ?? undefined).catch(() => {
      setMine(before)
      toast('Could not save your rating. Try again.')
    })
  }
  return (
    <article aria-label="Jimmy's answer">
      <div className="mb-2 flex items-center gap-2">
        <JimmyBadge className="size-7" />
        <span className="flex flex-col">
          <span className="text-sm font-semibold">Jimmy</span>
          {streaming && status && (
            <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {status.label}
              {status.working && (
                <span className="flex items-end gap-0.5 pb-0.5" aria-hidden>
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                </span>
              )}
            </span>
          )}
        </span>
        {tools.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {tools.map((t) => (
              <span key={t.label} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                <Check className="size-3" aria-hidden />
                {t.label}
                {t.meta && ` · ${t.meta}`}
              </span>
            ))}
          </span>
        )}
      </div>
      {conflicts.map((c) => (
        <ConflictCard key={c.interruptId} spaceId={spaceId} card={c} onDecide={onDecide ?? (() => {})} />
      ))}
      <Segments content={content} citations={citations} streaming={streaming} />
      {!streaming && (
        <div className="mt-3 flex flex-wrap items-center gap-1 text-muted-foreground">
          <span className="mr-1 text-xs">Was this helpful?</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(rating === 'up' && 'bg-success-soft text-success')}
            onClick={() => rate(rating === 'up' ? null : 'up')}
            aria-pressed={rating === 'up'}
            aria-label="Helpful"
          >
            <ThumbsUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(rating === 'down' && 'bg-destructive-soft text-destructive')}
            onClick={() => rate(rating === 'down' ? null : 'down')}
            aria-pressed={rating === 'down'}
            aria-label="Not helpful"
          >
            <ThumbsDown />
          </Button>
          {rating === 'down' && (
            <span className="ml-1 flex flex-wrap gap-1">
              {DOWN_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  aria-pressed={mine.comment === reason}
                  className={cn('rounded-full border border-border px-2 py-0.5 text-xs hover:bg-muted', mine.comment === reason && 'bg-muted text-foreground')}
                  onClick={() => {
                    rate('down', mine.comment === reason ? null : reason)
                    if (mine.comment !== reason) toast(`Thanks, noted: ${reason}`)
                  }}
                >
                  {reason}
                </button>
              ))}
            </span>
          )}
          {rating === 'up' && <span className="text-xs">Thanks!</span>}
          {usage && (
            <span className="ml-auto rounded-md bg-muted px-2 py-0.5 font-mono text-[11px]">
              {usage.tokensIn.toLocaleString()} in · {usage.tokensOut.toLocaleString()} out · {usage.costUsd === null ? 'cost unknown' : `≈ ${formatCost(usage.costUsd)}`}
            </span>
          )}
        </div>
      )}
    </article>
  )
}
