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
        {ok ? (feedback.type === 'essay' ? 'Well covered' : 'Correct') : unsure ? 'Marked for review' : 'Not quite'}
        {theirs && <span className="text-xs font-normal text-muted-foreground">· your call</span>}
      </p>
      {feedback.type === 'short_answer' && !ok && (
        <p className="mt-1 text-[15px]">
          <span className="text-muted-foreground">Expected:</span> {feedback.correct_answer}
        </p>
      )}
      {feedback.criteria && (
        <ul className="mt-2 space-y-2" aria-label="Rubric">
          {feedback.criteria.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-[15px]">
              {c.met === 1 ? <Check className="mt-1 size-4 flex-none text-success" aria-hidden /> : c.met === 0 ? <X className="mt-1 size-4 flex-none text-destructive" aria-hidden /> : <CircleHelp className="mt-1 size-4 flex-none text-muted-foreground" aria-hidden />}
              <span>
                <span className="font-medium">{c.criterion}</span>
                <span className="text-muted-foreground"> · {c.met === 1 ? 'covered' : c.met === 0 ? 'missing' : 'partly covered'}</span>
                {c.comment && <span className="block text-sm text-muted-foreground">{c.comment}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {feedback.note && <p className="mt-1 text-[15px]">{feedback.note}</p>}
      <p className="mt-1 text-[15px]">{feedback.explanation}</p>
      <SourceBlock feedback={feedback} />
    </div>
  )
}
