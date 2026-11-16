import { Check, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import type { Recap as RecapData } from '../schemas/study'
import { SourceBlock } from './SourceBlock'

// The end of a Quiz: the score, then every question with its answer and source.
export function Recap({ recap, spaceName, onAgain, onDone }: { recap: RecapData; spaceName: string; onAgain: () => void; onDone: () => void }) {
  const weak = recap.by_topic.filter((t) => t.weak)
  return (
    <>
      <div className={cn(cardClass, 'p-6')}>
        <p className="text-sm text-muted-foreground">Quiz summary · {spaceName}</p>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <p className="text-4xl font-semibold tabular-nums">
            {recap.score}
            <span className="text-xl text-muted-foreground"> / {recap.total}</span>
          </p>
          <p className="pb-1 text-sm text-muted-foreground">
            {weak.length ? `Weak topics: ${weak.map((t) => t.topic).join(', ')}.` : 'Weak topics have been updated.'}
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="space" size="sm" onClick={onAgain}>
            <RotateCcw /> Try again
          </Button>
          <Button variant="outline" size="sm" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
      <ol className="mt-6 space-y-4">
        {recap.questions.map((q) => (
          <li key={q.question_id} className={cn(cardClass, 'p-5')}>
            <div className="flex items-start gap-3">
              <span
                className={cn('grid size-7 flex-none place-items-center rounded-full text-xs font-semibold', q.correct ? 'bg-success-soft text-success' : 'bg-destructive-soft text-destructive')}
                aria-hidden
              >
                {q.correct ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              </span>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  Q{q.position} · {q.topic} · <span className="font-medium">{q.correct ? 'Correct' : 'Incorrect'}</span>
                </p>
                <p className="mt-1 font-serif text-lg leading-snug">{q.prompt}</p>
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Your answer:</span> {q.answer}
                </p>
                {!q.correct && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Correct:</span> {q.correct_answer}
                  </p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">{q.explanation}</p>
                <SourceBlock feedback={q} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
