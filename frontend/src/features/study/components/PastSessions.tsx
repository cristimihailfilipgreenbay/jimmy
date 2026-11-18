import { useEffect, useRef } from 'react'
import { Check, ChevronRight, GraduationCap, Target } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { SegmentedControl } from '@/components/SegmentedControl'
import { PageNav } from '@/components/PageNav'
import { Button } from '@/components/ui/button'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { longDate, shortDate, tile, weekLabel } from '../lib/dates'
import { usePastSessions } from '../queries/useQuiz'
import { modeOf, PAST_SESSIONS_PAGE, STUDY_MODES, type PastSession, type StudyMode } from '../schemas/study'

type Filter = 'all' | StudyMode
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'quiz', label: 'Quick Quizzes' },
  { value: 'short', label: 'Short Quizzes' },
  { value: 'essay', label: 'Essays' },
  { value: 'test', label: 'Tests' },
]
const NONE_YET: Record<StudyMode, string> = { quiz: 'quick quizzes', short: 'short quizzes', essay: 'essays', test: 'tests' }

const plural = (n: number) => `${n} weak topic${n === 1 ? '' : 's'}`

// The finished Quizzes and Tests of a Study Space, newest first, ten to a page and grouped
// by week. Opening one shows its recap.
export function PastSessions({ studentId, spaceId, onOpen, onStart }: { studentId: string; spaceId: string; onOpen: (id: string) => void; onStart: () => void }) {
  // The filter and the page are kept in the address (?show=quiz&page=2), so a refresh, a
  // link or the back button from a recap returns to the same place.
  const [params, setParams] = useSearchParams()
  const asked = params.get('show')
  const filter: Filter = FILTERS.some((f) => f.value === asked) ? (asked as Filter) : 'all'
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1)
  const show = (next: { filter?: Filter; page?: number }, replace = false) =>
    setParams(
      (old) => {
        const out = new URLSearchParams(old)
        const f = next.filter ?? filter
        const p = next.page ?? page
        if (f === 'all') out.delete('show')
        else out.set('show', f)
        if (p === 1) out.delete('page')
        else out.set('page', String(p))
        return out
      },
      { replace },
    )
  const setFilter = (f: Filter) => show({ filter: f, page: 1 })
  const setPage = (p: number) => show({ page: p })
  const { data, isPending } = usePastSessions(studentId, spaceId, filter, page)
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalAll = data?.total_all ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAST_SESSIONS_PAGE))
  // A page past the end (an old link, or sessions that are gone) goes to the last one.
  const tooFar = !!data && total > 0 && page > pageCount
  useEffect(() => {
    if (tooFar) show({ page: pageCount }, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooFar, pageCount])
  // A new page puts focus on its first row, once it has arrived.
  const focusFirst = useRef(false)
  const section = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!focusFirst.current) return
    focusFirst.current = false
    section.current?.querySelector<HTMLElement>('[data-row="0"]')?.focus()
  }, [data])

  const groups: { label: string; items: { session: PastSession; index: number }[] }[] = []
  items.forEach((session, index) => {
    const label = weekLabel(session.finished_at)
    const group = groups.at(-1)
    if (group?.label === label) group.items.push({ session, index })
    else groups.push({ label, items: [{ session, index }] })
  })
  const from = (page - 1) * PAST_SESSIONS_PAGE + 1

  return (
    <section ref={section} className="mt-10" aria-labelledby="past-h">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight" id="past-h">
            Past sessions
          </h2>
          <p className="text-sm text-muted-foreground">
            {isPending ? 'Loading…' : totalAll ? `${totalAll} finished · newest first` : 'Your finished sessions will appear here.'}
          </p>
        </div>
        {!isPending && totalAll > 0 && (
          <div className="sm:w-64">
            <SegmentedControl
              label="Show"
              options={FILTERS}
              value={filter}
              onChange={setFilter}
            />
          </div>
        )}
      </div>
      {isPending ? (
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
      ) : !totalAll ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-space/12 text-space-ink">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          <p className="mt-3 font-semibold">No finished sessions yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">When you finish a session, its recap lands here: your score, every answer and the source behind it.</p>
          <Button variant="space" size="sm" className="mt-4" onClick={onStart}>
            <Check /> Start your first quick quiz
          </Button>
        </div>
      ) : !total ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
          No {filter === 'all' ? 'sessions' : NONE_YET[filter]} yet.{' '}
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
          {pageCount > 1 && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <PageNav
                label="Past sessions pages"
                page={page}
                pageCount={pageCount}
                onPage={(n) => {
                  focusFirst.current = true
                  setPage(n)
                }}
              />
              <p className="text-xs text-muted-foreground">
                Showing {from}–{from + items.length - 1} of {total}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Row({ session, index, onOpen }: { session: PastSession; index: number; onOpen: () => void }) {
  const { month, day } = tile(session.finished_at)
  const shown = session.topics.slice(0, 2)
  const more = session.topics.length - shown.length
  const weak = session.weak_left
  const test = session.kind === 'test'
  const title = STUDY_MODES[modeOf(session)].title
  return (
    <li className="ob-pop" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <button
        type="button"
        data-row={index}
        data-session={session.id}
        onClick={onOpen}
        className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-space/5 focus-visible:bg-space/5"
        aria-label={`${title}, ${longDate(session.finished_at)}, score ${session.score} of ${session.total}${weak.length ? `, left ${plural(weak.length)}` : ''}. Open recap.`}
      >
        <span className="flex w-12 flex-none flex-col items-center rounded-lg border border-border bg-background py-1 leading-none" aria-hidden>
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{month}</span>
          <span className="mt-0.5 text-lg font-semibold tabular-nums">{day}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', test ? 'bg-muted text-foreground' : 'bg-space/12 text-space-ink')}>{title}</span>
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
