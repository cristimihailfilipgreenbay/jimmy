import { useState, type FormEvent } from 'react'
import { GitMerge, Pencil, Tag, Trash2 } from 'lucide-react'
import { ShowMore } from '@/components/ShowMore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/http'
import { cardClass } from '@/lib/styles'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { DeleteTopicDialog } from './components/DeleteTopicDialog'
import { useMergeTopics } from './queries/useMergeTopics'
import { useRenameTopic } from './queries/useRenameTopic'
import { useTopics } from './queries/useTopics'
import { topicNameSchema, type Topic } from './schemas/topic'

// The Topics tab of a Study Space: the approved Topics, to rename or to merge duplicates.
export function TopicsTab({ studentId, spaceId }: { studentId: string; spaceId: string }) {
  const query = useTopics(studentId, spaceId)
  const { isPending } = query
  const topics = query.data?.topics ?? []
  const total = query.data?.total ?? 0
  const rename = useRenameTopic(studentId, spaceId)
  const merge = useMergeTopics(studentId, spaceId)
  const [selected, setSelected] = useState<string[]>([])
  // "Select all N topics": every Topic of the Space, including the ones not loaded yet.
  const [allSelected, setAllSelected] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState<Topic[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const error =
    problem ??
    (rename.error ? errorMessage(rename.error, 'Could not rename the topic.') : null) ??
    (merge.error ? errorMessage(merge.error, 'Could not merge the topics.') : null)

  if (isPending) return null

  if (!topics.length) {
    return (
      <div className={`${cardClass} px-6 py-12 text-center`}>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-muted">
          <Tag className="size-5" aria-hidden />
        </span>
        <p className="mt-3 font-semibold">No topics yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Topics appear after Jimmy reads your first notes. You’ll get to approve them.
        </p>
      </div>
    )
  }

  const reset = () => {
    setProblem(null)
    rename.reset()
    merge.reset()
  }
  const toggle = (id: string) => {
    reset()
    // Taking one out of "all" leaves the ones on screen, minus that one.
    if (allSelected) {
      setAllSelected(false)
      setSelected(topics.filter((t) => t.id !== id).map((t) => t.id))
      return
    }
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  function saveName(e: FormEvent) {
    e.preventDefault()
    if (!renaming) return
    const parsed = topicNameSchema.safeParse(renaming.name)
    if (!parsed.success) return setProblem(parsed.error.issues[0].message)
    reset()
    rename.mutate({ id: renaming.id, name: parsed.data }, { onSuccess: () => setRenaming(null) })
  }

  function mergeSelected() {
    reset()
    // The first one picked stays, with its name; the others are merged into it.
    const keep = topics.find((t) => t.id === selected[0])
    if (!keep) return
    merge.mutate(
      { ids: selected, name: keep.name },
      {
        onSuccess: () => {
          toast(`Merged ${selected.length} topics into “${keep.name}”`, GitMerge)
          setSelected([])
        },
      },
    )
  }

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-center gap-3 border-b p-3">
        <input
          type="checkbox"
          aria-label="Select all topics shown"
          className="size-4 rounded border-input accent-space"
          checked={allSelected || selected.length === topics.length}
          ref={(el) => {
            if (el) el.indeterminate = !allSelected && selected.length > 0 && selected.length < topics.length
          }}
          onChange={() => {
            reset()
            setAllSelected(false)
            setSelected(allSelected || selected.length === topics.length ? [] : topics.map((t) => t.id))
          }}
        />
        <p className="text-sm text-muted-foreground">
          {allSelected ? (
            <strong className="text-foreground">All {total} selected</strong>
          ) : selected.length ? (
            <strong className="text-foreground">{selected.length} selected</strong>
          ) : (
            'Select topics to merge duplicates or delete'
          )}
        </p>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="enabled:hover:bg-destructive-soft enabled:hover:text-destructive"
            disabled={!allSelected && selected.length === 0}
            disabledReason="Select at least one topic to delete"
            onClick={() => (allSelected ? setDeletingAll(true) : setDeleting(topics.filter((t) => selected.includes(t.id))))}
          >
            <Trash2 /> Delete
          </Button>
          <Button variant="outline" size="sm" disabled={allSelected || selected.length < 2 || merge.isPending}
            disabledReason={merge.isPending ? 'Merging…' : allSelected ? 'Pick the topics to merge: not all of them' : 'Select at least two topics to merge'}
            onClick={mergeSelected}>
            <GitMerge /> Merge
          </Button>
        </div>
      </div>
      {/* All the loaded topics are ticked and there are more: offer every topic of the Space. */}
      {(allSelected || (selected.length === topics.length && total > topics.length)) && (
        <p className="border-b bg-muted/50 px-3 py-2 text-sm" role="status">
          {allSelected ? (
            <>
              All {total} topics are selected.{' '}
              <button type="button" className="font-medium text-space-ink underline underline-offset-2" onClick={() => setAllSelected(false)}>
                Clear selection
              </button>
            </>
          ) : (
            <>
              The {selected.length} topics on this screen are selected.{' '}
              <button type="button" className="font-medium text-space-ink underline underline-offset-2" onClick={() => setAllSelected(true)}>
                Select all {total} topics
              </button>
            </>
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="border-b px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <ul role="list" className="divide-y">
        {topics.map((t) => (
          <li
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 transition-colors duration-200',
              allSelected || selected.includes(t.id) ? 'bg-space/5' : 'hover:bg-muted/40',
            )}
          >
            <input
              type="checkbox"
              id={`topic-${t.id}`}
              className="size-4 rounded border-input accent-space"
              checked={allSelected || selected.includes(t.id)}
              onChange={() => toggle(t.id)}
            />
            {renaming?.id === t.id ? (
              <form className="flex flex-1 gap-2" onSubmit={saveName}>
                <Input
                  autoFocus
                  className="h-8"
                  value={renaming.name}
                  onChange={(e) => setRenaming({ id: t.id, name: e.target.value })}
                  aria-label="New topic name"
                />
                <Button variant="space" size="sm" type="submit" disabled={rename.isPending} disabledReason="Saving…">
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    reset()
                    setRenaming(null)
                  }}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <>
                <label htmlFor={`topic-${t.id}`} className="flex-1 text-sm font-medium">
                  {t.name}
                </label>
                {/* Topics are not linked to passages or quiz results yet, so both are zero. */}
                <span className="hidden w-24 text-xs text-muted-foreground sm:block">0 sources</span>
                <div className="hidden w-28 items-center gap-2 sm:flex" title="Mastery 0%">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-space" style={{ width: '0%' }} />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums">0%</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Rename ${t.name}`}
                  onClick={() => {
                    reset()
                    setRenaming({ id: t.id, name: t.name })
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive enabled:hover:bg-destructive-soft"
                  aria-label={`Delete ${t.name}`}
                  onClick={() => setDeleting([t])}
                >
                  <Trash2 />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="px-3 pb-4">
        <ShowMore shown={topics.length} total={query.data?.total ?? 0} hasMore={!!query.hasNextPage} loading={query.isFetchingNextPage} onMore={() => query.fetchNextPage()} />
      </div>
      <DeleteTopicDialog
        studentId={studentId}
        spaceId={spaceId}
        topics={deleting}
        all={deletingAll ? total : undefined}
        onDeleted={() => {
          if (deletingAll) {
            setAllSelected(false)
            setSelected([])
          }
        }}
        onClose={() => {
          setDeletingAll(false)
          setDeleting([])
          setSelected((s) => s.filter((id) => !deleting.some((t) => t.id === id)))
        }}
      />
    </div>
  )
}
