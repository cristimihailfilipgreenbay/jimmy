import { useEffect, useRef, useState } from 'react'
import { Check, ChevronRight, GraduationCap, Target } from 'lucide-react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { longDate, shortDate, tile, weekLabel } from '../lib/dates'
import type { PastSession } from '../schemas/study'

const PAGE = 8
type Filter = 'all' | 'quiz' | 'test'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'quiz', label: 'Quizzes' },
  { value: 'test', label: 'Tests' },
]

const plural = (n: number) => `${n} weak topic${n === 1 ? '' : 's'}`

// The finished Quizzes and Tests of a Study Space, newest first, grouped by week. Opening
// one shows its recap.
export function PastSessions({
  sessions,
  loading,
  onOpen,
  onStart,
}: {
  sessions: PastSession[]
  loading: boolean
  onOpen: (id: string) => void
  onStart: () => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [shown, setShown] = useState(PAGE)
  const list = sessions.filter((s) => filter === 'all' || s.kind === filter)
  const visible = list.slice(0, shown)
  const left = list.length - visible.length
  // "Show more" moves focus to the first new row, once it is on the page.
  const focusRow = useRef<number | null>(null)
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focusRow.current === null) return
    body.current?.querySelector<HTMLElement>(`[data-row="${focusRow.current}"]`)?.focus()
    focusRow.current = null
  }, [shown])

  const groups: { label: string; items: { session: PastSession; index: number }[] }[] = []
  visible.forEach((session, index) => {
    const label = weekLabel(session.finished_at)
    const group = groups.at(-1)
    if (group?.label === label) group.items.push({ session, index })
    else groups.push({ label, items: [{ session, index }] })
  })

  return (
    <section className="mt-10" aria-labelledby="past-h">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight" id="past-h">
            Past sessions
          </h2>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : sessions.length ? `${sessions.length} finished · newest first` : 'Your finished quizzes and tests will appear here.'}
          </p>
        </div>
        {!loading && sessions.length > 0 && (
          <div className="sm:w-64">
            <SegmentedControl
              label="Show"
              options={FILTERS}
              value={filter}
              onChange={(value) => {
                setFilter(value)
                setShown(PAGE)
              }}
            />
          </div>
        )}
      </div>
      <div ref={body}>
        {loading ? (
          <div className={cardClass} aria-busy="true" aria-label="Loading past sessions">
            <ul className="divide-y divide-border">
              {[1, 2, 3, 4].map((i) => (
                <li key={i} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="skel h-11 w-12 rounded-lg" />
                  <div className="flex-1">
                    <div className="skel h-3 w-24 rounded" />
                    <div className="skel mt-2 h-3 w-2/3 rounded" />
                  </div>
                  <div className="skel h-5 w-12 rounded" />
                </li>
              ))}
            </ul>
          </div>
        ) : !sessions.length ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-space/12 text-space-ink">
              <GraduationCap className="size-5" aria-hidden />
            </span>
            <p className="mt-3 font-semibold">No finished sessions yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">When you finish a quiz or test, its recap lands here: your score, every answer and the source behind it.</p>
            <Button variant="space" size="sm" className="mt-4" onClick={onStart}>
              <Check /> Start your first quiz
            </Button>
          </div>
        ) : !list.length ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
            No {filter === 'test' ? 'tests' : 'quizzes'} yet.{' '}
            <Button variant="link" size="sm" className="h-auto" onClick={() => setFilter('all')}>
              Show all sessions
            </Button>
          </div>
        ) : (
          <>
            {groups.map((group, g) => (
              <div key={group.label} className={cn(cardClass, 'overflow-hidden', g > 0 && 'mt-4')}>
                <p className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">{group.label}</p>
                <ul className="divide-y divide-border">
                  {group.items.map(({ session, index }) => (
                    <Row key={session.id} session={session} index={index} onOpen={() => onOpen(session.id)} />
                  ))}
                </ul>
              </div>
            ))}
            {left > 0 ? (
              <div className="mt-4 flex flex-col items-center gap-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    focusRow.current = visible.length
                    setShown(shown + PAGE)
                  }}
                >
                  Show {Math.min(PAGE, left)} more
                </Button>
                <p className="text-xs text-muted-foreground">
                  Showing {visible.length} of {list.length}
                </p>
              </div>
            ) : (
              list.length > PAGE && <p className="mt-4 text-center text-xs text-muted-foreground">That’s everything · {list.length} sessions</p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function Row({ session, index, onOpen }: { session: PastSession; index: number; onOpen: () => void }) {
  const { month, day } = tile(session.finished_at)
  const shown = session.topics.slice(0, 2)
  const more = session.topics.length - shown.length
  const weak = session.weak_left
  const test = session.kind === 'test'
  return (
    <li className="ob-pop" style={{ animationDelay: `${Math.min(index % PAGE, 8) * 40}ms` }}>
      <button
        type="button"
        data-row={index}
        data-session={session.id}
        onClick={onOpen}
        className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-space/5 focus-visible:bg-space/5"
        aria-label={`${test ? 'Test' : 'Quiz'}, ${longDate(session.finished_at)}, score ${session.score} of ${session.total}${weak.length ? `, left ${plural(weak.length)}` : ''}. Open recap.`}
      >
        <span className="flex w-12 flex-none flex-col items-center rounded-lg border border-border bg-background py-1 leading-none" aria-hidden>
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{month}</span>
          <span className="mt-0.5 text-lg font-semibold tabular-nums">{day}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', test ? 'bg-muted text-foreground' : 'bg-space/12 text-space-ink')}>{test ? 'Test' : 'Quiz'}</span>
            <span className="text-xs text-muted-foreground">{shortDate(session.finished_at)}</span>
          </span>
          <span className="mt-1 block truncate text-sm">
            {shown.join(', ')}
            {more > 0 && <span className="text-muted-foreground"> +{more} more</span>}
          </span>
          {weak.length ? (
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-space-ink/80" title={weak.join(', ')}>
              <span className="grid size-[18px] place-items-center rounded-full bg-space/14">
                <Target className="size-3" aria-hidden />
              </span>
              Left {plural(weak.length)}
            </span>
          ) : (
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="grid size-[18px] place-items-center rounded-full bg-success-soft text-success">
                <Check className="size-3" aria-hidden />
              </span>
              No new weak topics
            </span>
          )}
        </span>
        <span className="flex flex-none flex-col items-end gap-1.5">
          <span className="text-lg font-semibold tabular-nums">
            {session.score} <span className="text-sm font-normal text-muted-foreground">/ {session.total}</span>
          </span>
          <span className="flex gap-0.5" aria-hidden>
            {Array.from({ length: session.total }, (_, k) => (
              <span key={k} className={cn('h-1 w-2.5 rounded-full', k < session.score ? 'bg-space' : 'bg-border')} />
            ))}
          </span>
        </span>
        <ChevronRight className="size-4 flex-none text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
      </button>
    </li>
  )
}
