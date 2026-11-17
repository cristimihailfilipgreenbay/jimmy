import { useState } from 'react'
import { Book, MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { LearnedTab } from '@/features/learned/LearnedTab'
import { useLearnedMaterial } from '@/features/learned/queries/useLearnedMaterial'
import { useSpaceEvents } from '@/features/learned/queries/useSpaceEvents'
import { LibraryCard } from '@/features/library/components/LibraryCard'
import { NotesTab } from '@/features/notes/NotesTab'
import { useDocuments } from '@/features/notes/queries/useDocuments'
import { PROCESSING } from '@/features/notes/schemas/document'
import { WeakTab } from '@/features/study/components/WeakTab'
import { useWeakTopics } from '@/features/study/queries/useWeakTopics'
import { TopicsTab } from '@/features/topics/TopicsTab'
import { useTopics } from '@/features/topics/queries/useTopics'
import { useSlidingIndicator } from '@/lib/useSlidingIndicator'
import { DropdownMenu, MenuButton } from '@/components/DropdownMenu'
import { Placeholder } from '@/components/Placeholder'
import { Button, buttonVariants } from '@/components/ui/button'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { cn } from '@/lib/utils'
import { DeleteSpaceDialog } from './components/DeleteSpaceDialog'
import { SpaceFormDialog } from './components/SpaceFormDialog'
import { useSpace } from './queries/useSpace'
import { useSpaces } from './queries/useSpaces'

// A Study Space's dashboard: its header, with the "⋯" menu that deletes it, and the
// tabs under it: Notes, Topics, Weak topics and Learned material.
type Tab = 'notes' | 'topics' | 'weak' | 'learned'
const TABS: Tab[] = ['notes', 'topics', 'weak', 'learned']
export function SpaceDashboardPage() {
  const { spaceId } = useParams()
  const student = useSignedInStudent()
  const navigate = useNavigate()
  const { data: space, isPending } = useSpace(student.id, spaceId)
  const { data: all } = useSpaces(student.id)
  // The tab lives in the address (?tab=topics), so it survives a refresh and can be linked to.
  const [params, setParams] = useSearchParams()
  const asked = params.get('tab')
  const tab: Tab = TABS.find((t) => t === asked) ?? 'notes'
  const setTab = (next: Tab) => setParams(next === 'notes' ? {} : { tab: next }, { replace: true })
  const [deleting, setDeleting] = useState(false)
  const [edit, setEdit] = useState({ open: false, n: 0 })
  const openEdit = () => setEdit((e) => ({ open: true, n: e.n + 1 }))
  // Not placed until the Space has loaded: before that the tabs are not on the page.
  const { container, indicator } = useSlidingIndicator<HTMLDivElement>(space ? tab : '', true)
  const notes = useDocuments(student.id, spaceId ?? '')
  const processing = notes.data?.some((d) => PROCESSING.includes(d.status)) ?? false
  const topics = useTopics(student.id, spaceId ?? '', processing)
  const learned = useLearnedMaterial(student.id, spaceId ?? '')
  const weak = useWeakTopics(student.id, spaceId ?? '')
  useSpaceEvents(student.id, spaceId)

  if (isPending) return null
  if (!space) return <Placeholder title="Study Space not found" note="That Study Space does not exist." />

  return (
    <section className="py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-space text-white" aria-hidden>
            <Book className="size-5" />
          </span>
          <h1 className="sr-only">{space.name}</h1>
          {/* The title is a button: click it to edit the name, course details and colour. */}
          <button
            type="button"
            onClick={openEdit}
            aria-label={`Edit ${space.name}: name, course details and colour`}
            className="group/title -m-1.5 rounded-lg p-1.5 text-left transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-2">
              <span className="text-2xl font-semibold tracking-tight" aria-hidden>
                {space.name}
              </span>
              <span className="text-muted-foreground opacity-0 transition-opacity duration-200 group-hover/title:opacity-100 group-focus-visible/title:opacity-100" aria-hidden>
                <Pencil className="size-4" />
              </span>
            </span>
            <span className={cn('block text-sm', space.course ? 'text-muted-foreground' : 'text-muted-foreground/80 italic')}>
              {space.course ?? 'Add course code and lecturer'}
            </span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LibraryCard studentId={student.id} space={space} />
          <Link to={`/spaces/${space.id}/chat`} className={buttonVariants({ variant: 'space' })}>
            <MessageSquare /> Ask Jimmy
          </Link>
          <DropdownMenu
            align="right"
            className="top-11 w-48"
            trigger={({ open, toggle }) => (
              <Button variant="outline" size="icon" onClick={toggle} aria-label="More Space options" aria-haspopup="menu" aria-expanded={open}>
                ⋯
              </Button>
            )}
          >
            <MenuButton onClick={openEdit}>
              <Pencil className="size-4" aria-hidden /> Edit Space…
            </MenuButton>
            <MenuButton destructive onClick={() => setDeleting(true)}>
              <Trash2 className="size-4" aria-hidden /> Delete Space…
            </MenuButton>
          </DropdownMenu>
        </div>
      </div>
      <div ref={container} className="relative mb-5">
        <span className="absolute inset-x-0 bottom-0 h-px bg-border" aria-hidden />
        <span ref={indicator} aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-space" />
        <div role="tablist" aria-label="Space sections" className="flex gap-1 overflow-x-auto">
          {(
            [
              ['notes', 'Notes', notes.data?.length ?? 0],
              ['topics', 'Topics', topics.data?.total ?? 0],
              ['weak', 'Weak topics', weak.data?.total ?? 0],
              ['learned', 'Learned material', learned.data?.filter((m) => m.status === 'unreviewed').length ?? 0],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-controls={`panel-${key}`}
              aria-selected={tab === key}
              tabIndex={tab === key ? 0 : -1}
              data-ind-target
              data-active={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-200',
                tab === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              <span className="rounded-full bg-muted px-1.5 text-xs">{count}</span>
            </button>
          ))}
        </div>
      </div>
      <section key={tab} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="fade-in">
        {tab === 'notes' ? (
          <NotesTab studentId={student.id} space={space} />
        ) : tab === 'topics' ? (
          <TopicsTab studentId={student.id} spaceId={space.id} />
        ) : tab === 'weak' ? (
          <WeakTab studentId={student.id} spaceId={space.id} />
        ) : (
          <LearnedTab studentId={student.id} spaceId={space.id} spaceName={space.name} />
        )}
      </section>

      <SpaceFormDialog
        key={edit.n}
        studentId={student.id}
        usedAccents={all?.accents ?? []}
        space={space}
        open={edit.open}
        onClose={() => setEdit((e) => ({ ...e, open: false }))}
      />
      <DeleteSpaceDialog
        studentId={student.id}
        space={space}
        open={deleting}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate('/')}
      />
    </section>
  )
}
