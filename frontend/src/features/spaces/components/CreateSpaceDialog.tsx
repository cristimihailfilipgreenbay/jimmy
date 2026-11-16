import { useState, type FormEvent } from 'react'
import { Book, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/http'
import { ACCENTS, accentInfo, accentStyle } from '../lib/accents'
import { courseLine } from '../lib/course'
import { useCreateSpace } from '../queries/useCreateSpace'
import { spaceCourseSchema, spaceNameSchema, type Accent, type Space } from '../schemas/space'
import { AccentSwatches } from './AccentSwatches'

/** The design pre-selects the first colour no Space of yours uses yet. */
const firstUnusedAccent = (spaces: Space[]): Accent => {
  const used = new Set(spaces.map((s) => s.accent))
  return (ACCENTS.find((a) => !used.has(a.value)) ?? ACCENTS[0]).value
}

export function CreateSpaceDialog({
  studentId,
  spaces,
  open,
  onClose,
}: {
  studentId: string
  spaces: Space[]
  open: boolean
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [lecturer, setLecturer] = useState('')
  const [accent, setAccent] = useState<Accent>(() => firstUnusedAccent(spaces))
  const [invalid, setInvalid] = useState<{ name?: string; course?: string }>({})
  const create = useCreateSpace(studentId)
  const serverError = create.error ? errorMessage(create.error, 'Could not create the Study Space.') : null
  const course = courseLine(code, lecturer)

  function submit(e: FormEvent) {
    e.preventDefault()
    const parsedName = spaceNameSchema.safeParse(name)
    const parsedCourse = spaceCourseSchema.safeParse(course)
    if (!parsedName.success || !parsedCourse.success) {
      setInvalid({
        name: parsedName.success ? undefined : parsedName.error.issues[0].message,
        course: parsedCourse.success ? undefined : parsedCourse.error.issues[0].message,
      })
      return
    }
    setInvalid({})
    create.mutate({ name: parsedName.data, course: parsedCourse.data, accent }, { onSuccess: onClose })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight">New Study Space</DialogTitle>
              <DialogDescription className="mt-0.5">One Space per subject. You can add notes right after.</DialogDescription>
            </div>
            <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" className="-mt-1 -mr-2" aria-label="Close" />}>
              <X />
            </DialogClose>
          </div>

          {/* A live preview of the card this will become. */}
          <div style={accentStyle(accent)} className="mt-5 overflow-hidden rounded-xl border bg-background" aria-hidden>
            <div className="h-1.5 bg-space transition-colors duration-300" />
            <div className="flex items-center gap-3 p-4">
              <span className="grid size-10 flex-none place-items-center rounded-lg bg-space-soft text-space-ink transition-colors duration-300">
                <Book className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{name.trim() || <span className="text-muted-foreground">Your subject</span>}</p>
                <p className="truncate text-xs text-muted-foreground">{course || 'Preview of your new Space'}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="space-name">
                Subject name
              </label>
              <Input
                id="space-name"
                autoFocus
                className="h-10 text-[15px]"
                placeholder="e.g. Genetics"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={invalid.name ? true : undefined}
                aria-describedby={invalid.name ? 'space-name-error' : undefined}
              />
              {invalid.name && (
                <p id="space-name-error" className="mt-1.5 text-sm text-destructive">
                  {invalid.name}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="space-code">
                  Course code <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input id="space-code" className="h-10 text-[15px]" placeholder="e.g. BIO 202" maxLength={60} value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="space-lecturer">
                  Lecturer <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="space-lecturer"
                  autoComplete="off"
                  className="h-10 text-[15px]"
                  placeholder="e.g. Prof. Weber"
                  maxLength={60}
                  value={lecturer}
                  onChange={(e) => setLecturer(e.target.value)}
                />
              </div>
            </div>
            {invalid.course && <p className="text-sm text-destructive">{invalid.course}</p>}
            <div>
              <p className="mb-2 text-sm font-medium" id="space-colour-label">
                Colour · <span className="font-normal text-muted-foreground">{accentInfo(accent).label}</span>
              </p>
              <AccentSwatches value={accent} onChange={setAccent} labelledBy="space-colour-label" />
            </div>
          </div>

          {serverError && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {serverError}
            </p>
          )}
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              Create Space
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
