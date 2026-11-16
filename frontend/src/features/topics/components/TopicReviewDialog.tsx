import { useState } from 'react'
import { Check, GitMerge, Pencil, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHead } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { Document } from '@/features/notes/schemas/document'
import { accentStyle } from '@/features/spaces/lib/accents'
import type { Accent } from '@/features/spaces/schemas/space'
import { errorMessage } from '@/lib/http'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { initialItems, toDecisions, type ReviewItem } from '../lib/review'
import { useAnswerTopicReview } from '../queries/useAnswerTopicReview'
import { useTopicReview } from '../queries/useTopicReview'
import type { TopicReviewPayload } from '../schemas/topic'

// The pause after an upload: Jimmy has read the file and proposes Topics; the Student
// approves, renames, merges or removes them before they are used.
export function TopicReviewDialog({
  studentId,
  spaceId,
  accent,
  note,
  onClose,
}: {
  studentId: string
  spaceId: string
  accent: Accent
  note: Document | null
  onClose: () => void
}) {
  const review = useTopicReview(note?.thread_id ?? null)
  return (
    <Dialog open={note !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide style={accentStyle(accent)}>
        {note && review.data && (
          // Keyed so each document starts from its own proposals.
          <ReviewBody key={note.id} studentId={studentId} spaceId={spaceId} note={note} review={review.data} onClose={onClose} />
        )}
        {note && review.data === null && (
          <p className="p-5 text-sm text-muted-foreground">This document is not waiting for a review any more.</p>
        )}
        {note && review.isError && (
          <p role="alert" className="p-5 text-sm text-destructive">
            {errorMessage(review.error, 'Could not load the proposed topics.')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

type Review = NonNullable<ReturnType<typeof useTopicReview>['data']>

function ReviewBody({
  studentId,
  spaceId,
  note,
  review,
  onClose,
}: {
  studentId: string
  spaceId: string
  note: Document
  review: Review
  onClose: () => void
}) {
  const payload: TopicReviewPayload = review
  const [items, setItems] = useState<ReviewItem[]>(() => initialItems(payload))
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const answer = useAnswerTopicReview(studentId, spaceId)
  const error = problem ?? (answer.error ? errorMessage(answer.error, 'Could not save the topics.') : null)

  const change = (id: string, patch: Partial<ReviewItem>) => {
    setProblem(null)
    setItems((all) => all.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }
  const toggle = (item: ReviewItem, state: 'approved' | 'merge') => {
    if (item.state === state) return change(item.id, { state: 'new', into: undefined })
    change(item.id, state === 'merge' ? { state, into: targets(item)[0]?.id } : { state, into: undefined })
  }
  // What an item can be merged into: the Topics the Space has and the other proposals that are kept.
  const targets = (item: ReviewItem) => [
    ...payload.existing.map((e) => ({ id: e.id, name: e.name, existing: true })),
    ...items.filter((i) => i.id !== item.id && i.state !== 'rejected' && i.state !== 'merge').map((i) => ({ id: i.id, name: i.name, existing: false })),
  ]

  function save() {
    const result = toDecisions(items, payload)
    if ('error' in result) return setProblem(result.error)
    answer.mutate(
      { threadId: note.thread_id!, interruptId: review.interruptId, decision: result.decisions },
      {
        onSuccess: () => {
          toast('Topics saved. Indexing your notes…', Check)
          onClose()
        },
      },
    )
  }

  return (
    <>
      <DialogHead
        icon={<Tag className="size-4" />}
        title="Check the topics Jimmy found"
        description={
          <>
            From <strong>{note.title}</strong>
            {note.page_count !== null && ` (${note.page_count} ${note.page_count === 1 ? 'page' : 'pages'})`}. Topics drive
            quizzes and weak-topic tracking.
          </>
        }
      />
      <ul className="divide-y px-5" role="list">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              {item.state === 'rename' ? (
                <form
                  id={`rename-${item.id}`}
                  onSubmit={(e) => {
                    e.preventDefault()
                    change(item.id, { name: draft.trim() || item.name, state: 'approved' })
                  }}
                >
                  <Input
                    autoFocus
                    className="h-8"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label={`Rename ${item.name}`}
                  />
                </form>
              ) : (
                <p className={cn('text-sm font-medium', item.state === 'rejected' && 'text-muted-foreground line-through')}>{item.name}</p>
              )}
              {item.state === 'merge' && (
                <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <GitMerge className="size-3" aria-hidden /> Will merge into
                  <select
                    value={item.into ?? ''}
                    onChange={(e) => change(item.id, { into: e.target.value })}
                    aria-label={`Merge ${item.name} into`}
                    className="h-6 rounded-md border border-input bg-card px-1 text-xs font-semibold text-foreground"
                  >
                    {targets(item).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  · {payload.existing.some((e) => e.id === item.into) ? 'Already in this Space' : 'Same thing, different name'}
                </p>
              )}
              {item.state === 'approved' && (
                <p className="flex items-center gap-1 text-xs text-success">
                  <Check className="size-3" aria-hidden /> Approved
                </p>
              )}
            </div>
            <div className="flex gap-1">
              {item.state === 'rename' ? (
                <Button variant="space" size="sm" type="submit" form={`rename-${item.id}`}>
                  Save
                </Button>
              ) : (
                <>
                  <Button
                    variant={item.state === 'approved' ? 'space' : 'outline'}
                    size="sm"
                    aria-pressed={item.state === 'approved'}
                    onClick={() => toggle(item, 'approved')}
                  >
                    <Check />
                    <span className="sr-only sm:not-sr-only">Approve</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDraft(item.name)
                      change(item.id, { state: 'rename', into: undefined })
                    }}
                  >
                    <Pencil />
                    <span className="sr-only sm:not-sr-only">Rename</span>
                  </Button>
                  <Button
                    variant={item.state === 'merge' ? 'secondary' : 'ghost'}
                    size="sm"
                    aria-pressed={item.state === 'merge'}
                    onClick={() => toggle(item, 'merge')}
                  >
                    <GitMerge />
                    <span className="sr-only sm:not-sr-only">Merge</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${item.name}`}
                    aria-pressed={item.state === 'rejected'}
                    onClick={() => change(item.id, { state: item.state === 'rejected' ? 'new' : 'rejected', into: undefined })}
                  >
                    <X />
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="px-5 pt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t p-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setItems((all) => all.map((i) => (i.state === 'new' ? { ...i, state: 'approved' } : i)))}
        >
          Approve all remaining
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Later
          </Button>
          <Button variant="space" disabled={answer.isPending} disabledReason="Saving…" onClick={save}>
            Save topics
          </Button>
        </div>
      </div>
    </>
  )
}
