import { useState } from 'react'
import { Check, ThumbsDown, ThumbsUp } from 'lucide-react'
import { JimmyBadge } from '@/components/JimmyBadge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Citation } from '../schemas/chat'
import { Segments } from './Segments'

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
  streaming = false,
}: {
  content: string
  citations: Citation[]
  tools?: ToolPill[]
  streaming?: boolean
}) {
  // Rating is not stored yet (the feedback endpoint comes later); it only toggles here.
  const [rating, setRating] = useState<'up' | 'down' | null>(null)
  return (
    <article aria-label="Jimmy's answer">
      <div className="mb-2 flex items-center gap-2">
        <JimmyBadge className="size-7" />
        <span className="text-sm font-semibold">Jimmy</span>
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
      <Segments content={content} citations={citations} streaming={streaming} />
      {!streaming && (
        <div className="mt-3 flex flex-wrap items-center gap-1 text-muted-foreground">
          <span className="mr-1 text-xs">Was this helpful?</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(rating === 'up' && 'bg-success-soft text-success')}
            onClick={() => setRating(rating === 'up' ? null : 'up')}
            aria-pressed={rating === 'up'}
            aria-label="Helpful"
          >
            <ThumbsUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(rating === 'down' && 'bg-destructive-soft text-destructive')}
            onClick={() => setRating(rating === 'down' ? null : 'down')}
            aria-pressed={rating === 'down'}
            aria-label="Not helpful"
          >
            <ThumbsDown />
          </Button>
          {rating === 'up' && <span className="text-xs">Thanks!</span>}
        </div>
      )}
    </article>
  )
}
