import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/http'
import { useDeleteSpace } from '../queries/useDeleteSpace'
import type { Space } from '../schemas/space'

export function DeleteSpaceDialog({
  studentId,
  space,
  open,
  onClose,
  onDeleted,
}: {
  studentId: string
  space: Space
  open: boolean
  onClose: () => void
  onDeleted: () => void
}) {
  const [typed, setTyped] = useState('')
  const remove = useDeleteSpace(studentId)
  const error = remove.error ? errorMessage(remove.error, 'Could not delete the Study Space.') : null

  function close() {
    setTyped('')
    remove.reset()
    onClose()
  }

  // Deleting cannot be undone, so the Student types the name to confirm.
  const matches = typed.trim() === space.name

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent role="alertdialog">
        <div className="p-5">
          <div className="flex gap-3">
            <span className="grid size-9 flex-none place-items-center rounded-full bg-destructive-soft text-destructive" aria-hidden>
              <Trash2 className="size-4" />
            </span>
            <div className="flex-1">
              <DialogTitle>Delete the {space.name} Space?</DialogTitle>
              <DialogDescription className="mt-1">
                This permanently removes everything in this Space: its notes, flashcards, topics and chats. It can’t be
                undone.
              </DialogDescription>
              <label htmlFor="delete-confirm" className="mt-4 block text-sm font-medium">
                Type <span className="font-mono">{space.name}</span> to confirm
              </label>
              <Input
                id="delete-confirm"
                autoFocus
                autoComplete="off"
                className="mt-1.5"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
              {error && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!matches || remove.isPending}
              onClick={() => remove.mutate(space.id, { onSuccess: onDeleted })}
            >
              Delete Space
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
