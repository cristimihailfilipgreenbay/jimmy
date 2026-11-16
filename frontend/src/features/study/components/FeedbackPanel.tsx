import { Check, CircleHelp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Feedback } from '../schemas/study'
import { SourceBlock } from './SourceBlock'

// After an answer: right or not, why, and the source passage.
export function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  const ok = feedback.correct
  const unsure = feedback.decision === 'unsure'
  const theirs = feedback.graded_by === 'student'
  return (
    <div className={cn('fade-in mt-5 rounded-lg border p-4', ok ? 'border-success/40 bg-success-soft/50' : unsure ? 'border-border bg-muted/50' : 'border-destructive/30 bg-destructive-soft/50')}>
      <p className={cn('flex items-center gap-2 font-semibold', ok ? 'text-success' : unsure ? '' : 'text-destructive')}>
        {ok ? <Check className="size-4" aria-hidden /> : unsure ? <CircleHelp className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
        {ok ? 'Correct' : unsure ? 'Marked for review' : 'Not quite'}
        {theirs && <span className="text-xs font-normal text-muted-foreground">· your call</span>}
      </p>
      {feedback.type === 'short_answer' && !ok && (
        <p className="mt-1 text-[15px]">
          <span className="text-muted-foreground">Expected:</span> {feedback.correct_answer}
        </p>
      )}
      {feedback.note && <p className="mt-1 text-[15px]">{feedback.note}</p>}
      <p className="mt-1 text-[15px]">{feedback.explanation}</p>
      <SourceBlock feedback={feedback} />
    </div>
  )
}
