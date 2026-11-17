import { ArrowLeft, Check, CircleHelp, RotateCcw, Target, X } from 'lucide-react'
import { Link } from 'react-router'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { longDate } from '../lib/dates'
import type { Recap as RecapData } from '../schemas/study'
import { SourceBlock } from './SourceBlock'

// The end of a Quiz or a Test: the score (and for a Test, the score per Topic), then every
// question with its answer and source. A Test shows all of it only here. Opened from the
// past sessions list (`past`), it is read-only: a link back instead of Try again and Done,
// and a note on the weak Topics the session left.
export function Recap({
  recap,
  kind,
  spaceName,
  onAgain,
  onDone,
  past,
}: {
  recap: RecapData
  kind: 'quiz' | 'test'
  spaceName: string
  onAgain?: () => void
  onDone?: () => void
  past?: { onBack: () => void; weakHref: string }
}) {
  const weak = recap.by_topic.filter((t) => t.weak)
  // The first answer that was not right starts open, so the Student sees what to fix.
  const firstWrong = recap.questions.find((q) => !q.correct)
  const back = (bottom: boolean) =>
    past && (
      <div className={bottom ? 'mt-6 flex justify-center' : undefined}>
        <Button variant={bottom ? 'outline' : 'ghost'} size={bottom ? 'default' : 'sm'} className={bottom ? undefined : '-ml-2 mb-3'} onClick={past.onBack}>
          <ArrowLeft /> {bottom ? 'Back to past sessions' : 'Past sessions'}
        </Button>
      </div>
    )
  return (
    <>
      {back(false)}
      <div className={cn(cardClass, 'p-6')}>
        <p className="text-sm text-muted-foreground">
          {past ? `${kind === 'test' ? 'Test' : 'Quiz'} recap · ${recap.finished_at ? longDate(recap.finished_at) : ''}` : `${kind === 'test' ? 'Test results' : 'Quiz summary'} · ${spaceName}`}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <p className="text-4xl font-semibold tabular-nums">
            {recap.score}
            <span className="text-xl text-muted-foreground"> / {recap.total}</span>
          </p>
          <p className="pb-1 text-sm text-muted-foreground">
            {past
              ? `${spaceName} · ${recap.by_topic.length} topic${recap.by_topic.length === 1 ? '' : 's'}`
              : weak.length
                ? `Weak topics: ${weak.map((t) => t.topic).join(', ')}.`
                : 'Weak topics have been updated.'}
          </p>
        </div>
        {past && recap.weak_left.length > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-space/6 p-3 text-sm">
            <span className="grid size-7 flex-none place-items-center rounded-full bg-space/14 text-space-ink">
              <Target className="size-3.5" aria-hidden />
            </span>
            <div>
              <p className="font-medium">
                This session left {recap.weak_left.length} weak topic{recap.weak_left.length === 1 ? '' : 's'}
              </p>
              <p className="text-muted-foreground">{recap.weak_left.join(', ')}</p>
              <Link to={past.weakHref} className="mt-1 inline-block text-sm font-medium text-space-ink underline-offset-4 hover:underline">
                See Weak topics
              </Link>
            </div>
          </div>
        )}
        {!past && (
          <div className="mt-4 flex gap-2">
            <Button variant="space" size="sm" onClick={onAgain}>
              <RotateCcw /> Try again
            </Button>
            <Button variant="outline" size="sm" onClick={onDone}>
              Done
            </Button>
          </div>
        )}
      </div>
      {kind === 'test' && (
        <section className={cn(cardClass, 'mt-6 p-5')} aria-labelledby="by-topic">
          <h2 id="by-topic" className="text-sm font-semibold">
            By topic
          </h2>
          <ul className="mt-3 space-y-3">
            {recap.by_topic.map((t) => (
              <li key={t.topic_id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {t.topic}
                    {t.weak && <span className="ml-2 rounded-full bg-destructive-soft px-2 py-0.5 text-xs font-normal text-destructive">Weak</span>}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {t.correct} / {t.total}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round((t.correct / t.total) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${t.topic} score`}>
                  <div className="h-full bg-space" style={{ width: `${Math.round((t.correct / t.total) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Accordion multiple defaultValue={firstWrong ? [firstWrong.question_id] : []} className="mt-6 gap-4">
        {recap.questions.map((q, i) => (
          <AccordionItem
            key={q.question_id}
            value={q.question_id}
            className={cn(cardClass, 'px-5 not-last:border-b', past && 'ob-pop')}
            style={past ? { animationDelay: `${Math.min(i, 6) * 50}ms` } : undefined}
          >
            <AccordionTrigger className="items-center gap-3 py-4 hover:no-underline">
              <span
                className={cn(
                  'grid size-7 flex-none place-items-center rounded-full text-xs font-semibold',
                  q.correct ? 'bg-success-soft text-success' : q.decision === 'unsure' ? 'bg-muted' : 'bg-destructive-soft text-destructive',
                )}
                aria-hidden
              >
                {q.correct ? <Check className="size-3.5" /> : q.decision === 'unsure' ? <CircleHelp className="size-3.5" /> : <X className="size-3.5" />}
              </span>
              <span className="flex-1">
                <span className="block text-xs font-normal text-muted-foreground">
                  Q{q.position} · {q.topic} · <span className="font-medium">
                    {q.decision === 'unsure' ? 'Marked for review' : `${q.correct ? 'Correct' : 'Incorrect'}${q.graded_by === 'student' ? ' (your call)' : ''}`}
                  </span>
                </span>
                <span className="mt-1 block font-serif text-lg leading-snug font-normal">{q.prompt}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-5 pl-10 [&_p:not(:last-child)]:mb-0">
              <p className="text-sm">
                <span className="text-muted-foreground">Your answer:</span> {q.answer}
              </p>
              {!q.correct && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Correct:</span> {q.correct_answer}
                </p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{q.explanation}</p>
              <SourceBlock feedback={q} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {back(true)}
    </>
  )
}
