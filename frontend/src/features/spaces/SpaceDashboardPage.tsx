import { useState } from 'react'
import { Book, MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { DropdownMenu, MenuButton } from '@/components/DropdownMenu'
import { Placeholder } from '@/components/Placeholder'
import { Button, buttonVariants } from '@/components/ui/button'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { cn } from '@/lib/utils'
import { DeleteSpaceDialog } from './components/DeleteSpaceDialog'
import { SpaceFormDialog } from './components/SpaceFormDialog'
import { useSpaces } from './queries/useSpaces'

// A Study Space's dashboard: its header, with the "⋯" menu that deletes it. The
// tabs under it (Notes, Topics, Weak topics, Learned material) come with the
// features that fill them.
export function SpaceDashboardPage() {
  const { spaceId } = useParams()
  const student = useSignedInStudent()
  const navigate = useNavigate()
  const { data: spaces, isPending } = useSpaces(student.id)
  const [deleting, setDeleting] = useState(false)
  const [edit, setEdit] = useState({ open: false, n: 0 })
  const openEdit = () => setEdit((e) => ({ open: true, n: e.n + 1 }))
  const space = spaces?.find((s) => s.id === spaceId)

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
      <p className="text-muted-foreground">Notes, Topics, Weak Topics and Learned Material.</p>

      <SpaceFormDialog
        key={edit.n}
        studentId={student.id}
        spaces={spaces ?? []}
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
