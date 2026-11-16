import { Check, Globe, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/http'
import { cardClass } from '@/lib/styles'
import { toast } from '@/lib/toast'
import { useApproveLearned, useDeleteLearned } from './queries/useLearnedActions'
import { useLearnedMaterial } from './queries/useLearnedMaterial'
import type { LearnedMaterial } from './schemas/learned'

// The Learned material tab: web Findings Jimmy saved, waiting for the Student's review.
// Until approved they are labelled "Unreviewed web" and never feed Quizzes or Flashcards.
export function LearnedTab({ studentId, spaceId, spaceName }: { studentId: string; spaceId: string; spaceName: string }) {
  const { data = [], isPending } = useLearnedMaterial(studentId, spaceId)
  const approve = useApproveLearned(studentId, spaceId)
  const remove = useDeleteLearned(studentId, spaceId)
  const waiting = data.filter((m) => m.status === 'unreviewed')
  const error = approve.error ?? remove.error

  if (isPending) return null

  if (!waiting.length) {
    return (
      <div className={`${cardClass} px-6 py-12 text-center`}>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-muted">
          <Globe className="size-5" aria-hidden />
        </span>
        <p className="mt-3 font-semibold">Nothing to review</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          When Jimmy finds something useful on the web, it lands here first. Nothing is cited as library content until you approve it.
        </p>
      </div>
    )
  }

  const onApprove = (item: LearnedMaterial) =>
    approve.mutate(item.id, { onSuccess: () => toast(`Saved to ${spaceName} library · “${item.title}”`, Check) })
  const onDelete = (item: LearnedMaterial) =>
    remove.mutate(item.id, { onSuccess: () => toast(`Deleted “${item.title}”. Answers that used it are now marked.`, Trash2) })

  return (
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
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {errorMessage(error, 'Could not update that item.')}
        </p>
      )}
      <ul role="list" className="space-y-3">
        {waiting.map((item) => (
          <li key={item.id} className={`${cardClass} p-4`}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 font-serif text-[15px] leading-relaxed text-foreground/90">“{item.excerpt}”</p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="chip chip-web ml-0">
                    <TriangleAlert className="size-3.5" aria-hidden />
                    Unreviewed web · {item.publisher ?? new URL(item.url).host}
                  </span>
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
}
