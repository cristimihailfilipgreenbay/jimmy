import { useState, type FormEvent } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/http'
import { toast } from '@/lib/toast'
import { useUpdateSpace } from '../queries/useUpdateSpace'
import { spaceNameSchema, type Space } from '../schemas/space'

// Rename changes the name and nothing else.
export function RenameSpaceDialog({
  studentId,
  space,
  open,
  onClose,
}: {
  studentId: string
  space: Space
  open: boolean
  onClose: () => void
}) {
  const [name, setName] = useState(space.name)
  const [invalid, setInvalid] = useState<string | null>(null)
  const update = useUpdateSpace(studentId)
  const serverError = update.error ? errorMessage(update.error, 'Could not rename the Study Space.') : null

  function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = spaceNameSchema.safeParse(name)
    if (!parsed.success) return setInvalid(parsed.error.issues[0].message)
    setInvalid(null)
    update.mutate(
      { id: space.id, changes: { name: parsed.data } },
      {
        onSuccess: () => {
          onClose()
          toast(`Renamed to ${parsed.data}`, Pencil)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="p-5 sm:p-6">
          <DialogTitle className="text-lg font-semibold tracking-tight">Rename Space</DialogTitle>
          <label htmlFor="rename-name" className="mt-4 mb-1.5 block text-sm font-medium">
            Subject name
          </label>
          <Input
            id="rename-name"
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 text-[15px]"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={invalid ? true : undefined}
          />
          {(invalid || serverError) && (
            <p role="alert" className="mt-1.5 text-sm text-destructive">
              {invalid ?? serverError}
            </p>
          )}
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending || !name.trim()} disabledReason={update.isPending ? 'Saving…' : 'Enter a name'}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
