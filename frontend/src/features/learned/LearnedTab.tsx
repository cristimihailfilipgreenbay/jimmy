import { useState } from 'react'
import { Check, Globe, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/http'
import { cardClass } from '@/lib/styles'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useSlidingIndicator } from '@/lib/useSlidingIndicator'
import { useApproveLearned, useDeleteLearned } from './queries/useLearnedActions'
import { useLearnedMaterial } from './queries/useLearnedMaterial'
import type { LearnedMaterial } from './schemas/learned'

type View = 'review' | 'approved'

// The Learned material tab: web Findings Jimmy saved. "Review" lists those waiting for the
// Student; until approved they are labelled "Unreviewed web" and never feed Quizzes or
// Flashcards. "Approved" lists the ones that may.
export function LearnedTab({ studentId, spaceId, spaceName }: { studentId: string; spaceId: string; spaceName: string }) {
  const { data = [], isPending } = useLearnedMaterial(studentId, spaceId)
  const approve = useApproveLearned(studentId, spaceId)
  const remove = useDeleteLearned(studentId, spaceId)
  const [view, setView] = useState<View>('review')
  const waiting = data.filter((m) => m.status === 'unreviewed')
  const approved = data.filter((m) => m.status === 'approved')
  const error = approve.error ?? remove.error
  // The tabs are not on the page while the list loads, so the pill is only placed after.
  const { container, indicator } = useSlidingIndicator<HTMLDivElement>(isPending ? '' : view)

  if (isPending) return null

  const onApprove = (item: LearnedMaterial) =>
    approve.mutate(item.id, { onSuccess: () => toast(`Saved to ${spaceName} library · “${item.title}”`, Check) })
  const onDelete = (item: LearnedMaterial) =>
    remove.mutate(item.id, { onSuccess: () => toast(`Deleted “${item.title}”. Answers that used it are now marked.`, Trash2) })

  const empty = (title: string, note: string) => (
    <div className={`${cardClass} px-6 py-12 text-center`}>
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-muted">
        <Globe className="size-5" aria-hidden />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{note}</p>
    </div>
  )

  const review = !waiting.length ? (
    empty('Nothing to review', 'When Jimmy finds something useful on the web, it lands here first. Nothing is cited as library content until you approve it.')
  ) : (
    <>
      <div className="mb-4 flex items-start gap-3 rounded-lg border-[1.5px] border-dashed border-web-line bg-web-soft/60 p-3 text-sm text-web">
        <TriangleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
        <p>
          <strong>
            {waiting.length} web item{waiting.length === 1 ? '' : 's'} waiting for review.
          </strong>{' '}
          Until you approve them, answers that use them carry the “Unreviewed web” label.
        </p>
      </div>
      <ul role="list" className="space-y-3">
        {waiting.map((item) => (
          <li key={item.id} className={`${cardClass} p-4`}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 font-serif text-[15px] leading-relaxed text-foreground/90">“{item.excerpt}”</p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chip chip-web ml-0 hover:underline"
                      aria-label={`Unreviewed web, ${item.publisher ?? new URL(item.url).host}. Open the page.`}
                    >
                    <TriangleAlert className="size-3.5" aria-hidden />
                    Unreviewed web · {item.publisher ?? new URL(item.url).host}
                  </a>
                  Fetched {item.fetched_at ?? '–'} · used in {item.used_in_answers} answer{item.used_in_answers === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="space" size="sm" onClick={() => onApprove(item)} disabled={approve.isPending || remove.isPending}>
                  <Check /> Approve
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDelete(item)} disabled={approve.isPending || remove.isPending}>
                  <Trash2 /> Delete
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )

  const approvedList = !approved.length ? (
    empty('Nothing approved yet', 'Items you approve in Review move here, and Jimmy may then use them for Quizzes, Tests and Flashcards.')
  ) : (
    <ul role="list" className="space-y-3">
      {approved.map((item) => (
        <li key={item.id} className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 line-clamp-1 font-serif text-[15px] leading-relaxed text-foreground/90">“{item.excerpt}”</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chip chip-web ml-0 hover:underline"
                    aria-label={`Approved web, ${item.publisher ?? new URL(item.url).host}. Open the page.`}
                  >
                  <Check className="size-3.5" aria-hidden />
                  Approved web · {item.publisher ?? new URL(item.url).host}
                </a>
                Approved {item.approved_at ? new Date(item.approved_at).toLocaleDateString() : '–'} · used in {item.used_in_answers} answer{item.used_in_answers === 1 ? '' : 's'}
              </p>
            </div>
            <Button
                variant="outline"
                size="icon-sm"
                aria-label={`Delete “${item.title}”`}
                className="border-destructive/30 text-destructive enabled:hover:bg-destructive-soft enabled:hover:text-destructive"
                onClick={() => onDelete(item)}
                disabled={remove.isPending}
              >
                <Trash2 />
              </Button>
          </div>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      <div ref={container} role="tablist" aria-label="Learned material views" className="relative mb-5 inline-flex rounded-lg bg-muted p-1">
        <span ref={indicator} aria-hidden className="pointer-events-none absolute top-0 left-0 rounded-md bg-card shadow-sm" />
        {(
          [
            ['review', `Review (${waiting.length})`],
            ['approved', `Approved (${approved.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            data-ind-target
            data-active={view === key}
            onClick={() => setView(key)}
            className={cn('relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200', view === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {errorMessage(error, 'Could not update that item.')}
        </p>
      )}
      <div className="fade-in" key={view}>
        {view === 'review' ? review : approvedList}
      </div>
    </>
  )
}
