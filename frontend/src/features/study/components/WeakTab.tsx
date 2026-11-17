import { useState } from 'react'
import { Target, X } from 'lucide-react'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ShowMore } from '@/components/ShowMore'
import { errorMessage } from '@/lib/http'
import { cardClass } from '@/lib/styles'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useClearWeakTopic, useClearAllWeakTopics, useWeakTopics } from '../queries/useWeakTopics'

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

// The Weak topics tab: Topics the Student keeps getting wrong, each clearable.
export function WeakTab({ studentId, spaceId }: { studentId: string; spaceId: string }) {
  const query = useWeakTopics(studentId, spaceId)
  const { isPending } = query
  const data = query.data?.weak ?? []
  const total = query.data?.total ?? 0
  const clearOne = useClearWeakTopic(studentId, spaceId)
  const clearAll = useClearAllWeakTopics(studentId, spaceId)
  const [confirming, setConfirming] = useState(false)
  const [clearing, setClearing] = useState<{ id: string; name: string } | null>(null)

  if (isPending) return null
  if (!data.length) {
    return (
      <div className={`${cardClass} px-6 py-12 text-center`}>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-muted">
          <Target className="size-5" aria-hidden />
        </span>
        <p className="mt-3 font-semibold">No weak topics</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          When you miss questions in a quiz, Jimmy notes the topic here so you can focus. You can clear any of them.
        </p>
      </div>
    )
  }
  const error = clearOne.error ?? clearAll.error
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Jimmy remembers these to prioritise them in quizzes.</p>
        <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
          Clear all
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {errorMessage(error, 'Could not clear that topic.')}
        </p>
      )}
      <ul role="list" className="grid gap-3 md:grid-cols-2">
        {data.map((w) => (
          <li key={w.topic_id} className={cn(cardClass, 'flex items-start gap-3 p-4')}>
            <span className="grid size-9 flex-none place-items-center rounded-full bg-space-soft text-space-ink">
              <Target className="size-4" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="font-medium">{w.name}</p>
              <p className="text-sm text-muted-foreground">{w.consecutive_correct} of 3 correct in a row needed to recover.</p>
              <p className="mt-1 text-xs text-muted-foreground">Last seen {day(w.updated_at)} · via Quiz</p>
              <div className="mt-3 flex gap-2">
                <Link to={`/spaces/${spaceId}/study?topic=${w.topic_id}`} className={buttonVariants({ variant: 'space', size: 'sm' })}>
                  Practise this
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={clearOne.isPending}
                  onClick={() => setClearing({ id: w.topic_id, name: w.name })}
                >
                  <X /> Clear
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <ShowMore shown={data.length} total={total} hasMore={!!query.hasNextPage} loading={query.isFetchingNextPage} onMore={() => query.fetchNextPage()} />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Clear all weak topics in this Space?"
        description="Jimmy will stop prioritising them. Your notes, topics and flashcards are not affected."
        confirmLabel="Clear all"
        pending={clearAll.isPending}
        onConfirm={() =>
          clearAll.mutate(undefined, {
            onSuccess: () => {
              toast(`Cleared ${total} weak topic${total === 1 ? '' : 's'}`, X)
              setConfirming(false)
            },
          })
        }
      />
      <ConfirmDialog
        open={!!clearing}
        onOpenChange={(open) => !open && setClearing(null)}
        title={`Clear “${clearing?.name ?? ''}”?`}
        description="Jimmy will stop prioritising this topic, and your earlier answers to it stop counting."
        confirmLabel="Clear"
        pending={clearOne.isPending}
        onConfirm={() =>
          clearing &&
          clearOne.mutate(clearing.id, {
            onSuccess: () => {
              toast(`Cleared “${clearing.name}”`, X)
              setClearing(null)
            },
          })
        }
      />
    </>
  )
}
