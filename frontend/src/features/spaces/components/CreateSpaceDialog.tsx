import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/http'
import { ACCENTS, DEFAULT_ACCENT } from '../lib/accents'
import { useCreateSpace } from '../queries/useCreateSpace'
import { spaceCourseSchema, spaceNameSchema, type Accent } from '../schemas/space'

export function CreateSpaceDialog({ studentId, open, onClose }: { studentId: string; open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [course, setCourse] = useState('')
  const [accent, setAccent] = useState<Accent>(DEFAULT_ACCENT)
  const [invalid, setInvalid] = useState<{ name?: string; course?: string }>({})
  const create = useCreateSpace(studentId)
  const serverError = create.error ? errorMessage(create.error, 'Could not create the Study Space.') : null

  function close() {
    setInvalid({})
    create.reset()
    onClose()
  }

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
    create.mutate(
      { name: parsedName.data, course: parsedCourse.data, accent },
      {
        onSuccess: () => {
          setName('')
          setCourse('')
          setAccent(DEFAULT_ACCENT)
          close()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New Study Space</DialogTitle>
            <DialogDescription>One Space per subject. You can add notes right after.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="space-name">Subject name</Label>
            <Input
              id="space-name"
              autoFocus
              placeholder="e.g. Genetics"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={invalid.name ? true : undefined}
              aria-describedby={invalid.name ? 'space-name-error' : undefined}
            />
            {invalid.name && (
              <p id="space-name-error" className="text-sm text-destructive">
                {invalid.name}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="space-course">
              Course <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="space-course"
              placeholder="e.g. BIO 202 · Prof. Weber"
              maxLength={120}
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              aria-invalid={invalid.course ? true : undefined}
            />
            {invalid.course && <p className="text-sm text-destructive">{invalid.course}</p>}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Accent colour</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACCENTS.map((a) => (
                <label
                  key={a.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[:checked]:border-foreground has-[:checked]:bg-muted has-[:checked]:font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                >
                  <input
                    type="radio"
                    name="accent"
                    value={a.value}
                    className="sr-only"
                    checked={accent === a.value}
                    onChange={() => setAccent(a.value)}
                  />
                  <span className="size-4 flex-none rounded" style={{ backgroundColor: a.color }} aria-hidden />
                  {a.label}
                </label>
              ))}
            </div>
          </fieldset>
          {serverError && (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              <Plus /> Create Space
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
