import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import type { Dispute, DisputeDecision, Feedback, Question } from '../schemas/study'
import { DisputeCard } from './DisputeCard'
import { FeedbackPanel } from './FeedbackPanel'

type Shown = { prompt: string; type: string; topic: string; options: string[] | null }

// One question: the answer input, then (after Check answer) the feedback. A question
// already answered is shown again, read-only, with its feedback.
export function QuestionCard({
  question,
  feedback,
  test,
  submitted,
  dispute,
  checking,
  deciding,
  canGoBack,
  isLast,
  onCheck,
  onDecide,
  onBack,
  onNext,
  className,
}: {
  question: Question | null
  feedback: Feedback | null
  // A Test shows no feedback and no Dispute; `submitted` is the answer already given
  // to this question (an option number or the text), shown read-only when going back.
  test: boolean
  submitted: string | null
  // Set while the grader waits for the Student's decision on this question.
  dispute: Dispute | null
  checking: boolean
  deciding: boolean
  canGoBack: boolean
  isLast: boolean
  onCheck: (answer: string) => void
  onDecide: (decision: DisputeDecision) => void
  onBack: () => void
  onNext: () => void
  className?: string
}) {
  const shown: Shown = feedback ?? question!
  const multiple = shown.type === 'multiple_choice'
  const [choice, setChoice] = useState<string>()
  const [text, setText] = useState('')
  const answered = multiple ? choice !== undefined : text.trim() !== ''
  const revealed = !!feedback
  const locked = revealed || !!dispute || submitted !== null
  // The option the Student chose, as the number the backend takes.
  const picked = feedback && multiple ? shown.options?.indexOf(feedback.answer).toString() : (submitted ?? choice)
  const written = feedback?.answer ?? dispute?.answer ?? submitted ?? text
  const last = isLast ? (test ? 'Finish test' : 'See summary') : 'Next question'

  return (
    <div className={cn(cardClass, 'p-5 md:p-6', className)}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {multiple ? 'Multiple choice' : 'Short written answer'} · {shown.topic}
      </p>
      <h1 className="mt-2 font-serif text-xl leading-snug">{shown.prompt}</h1>
      <div className="mt-5">
        {multiple ? (
          <fieldset>
            <legend className="sr-only">Choose one answer</legend>
            <div className="space-y-2">
              {shown.options?.map((option, i) => {
                const chosen = picked === String(i)
                const right = revealed && option === feedback.correct_answer
                const wrong = revealed && chosen && !right
                return (
                  <label
                    key={i}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-[15px] transition-colors duration-200',
                      right ? 'border-success bg-success-soft' : wrong ? 'border-destructive bg-destructive-soft' : chosen ? 'border-space bg-space-soft ring-1 ring-space' : 'border-border bg-card hover:bg-muted',
                    )}
                  >
                    <input
                      type="radio"
                      name="mc"
                      value={i}
                      className="size-4 accent-(--space)"
                      checked={chosen}
                      disabled={revealed}
                      onChange={() => setChoice(String(i))}
                    />
                    <span className="grid size-6 flex-none place-items-center rounded-md border border-border text-xs font-semibold">{'ABCD'[i]}</span>
                    <span>{option}</span>
                    {right && (
                      <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-success">
                        <Check className="size-3.5" aria-hidden />
                        Correct answer
                      </span>
                    )}
                    {wrong && (
                      <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-destructive">
                        <X className="size-3.5" aria-hidden />
                        Your answer
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </fieldset>
        ) : (
          <>
            <label htmlFor="short-answer" className="mb-1.5 block text-sm font-medium">
              Your answer
            </label>
            <textarea
              id="short-answer"
              rows={3}
              className="w-full rounded-md border border-input bg-card p-3 text-[15px]"
              placeholder="Write one or two sentences…"
              value={written}
              disabled={locked}
              onChange={(e) => setText(e.target.value)}
            />
          </>
        )}
      </div>
      <div aria-live="polite">
        {feedback && <FeedbackPanel feedback={feedback} />}
        {dispute && <DisputeCard dispute={dispute} deciding={deciding} onDecide={onDecide} />}
      </div>
      <div className="mt-6 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={!canGoBack}>
          <ArrowLeft /> Back
        </Button>
        {revealed ? (
          <Button onClick={onNext} variant="space">
            {last}
            <ArrowRight />
          </Button>
        ) : submitted !== null ? (
          <Button onClick={onNext} variant="space">
            Next question
            <ArrowRight />
          </Button>
        ) : test ? (
          <Button variant="space" disabled={!answered || checking} onClick={() => onCheck(multiple ? choice! : text.trim())}>
            {checking ? 'Saving…' : last}
            <ArrowRight />
          </Button>
        ) : dispute ? null : (
          <Button variant="space" disabled={!answered || checking} onClick={() => onCheck(multiple ? choice! : text.trim())}>
            {checking ? 'Checking…' : 'Check answer'}
          </Button>
        )}
      </div>
    </div>
  )
}
