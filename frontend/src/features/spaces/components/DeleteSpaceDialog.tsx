import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/http'
import { useDeleteSpace } from '../queries/useDeleteSpace'
import type { Space } from '../schemas/space'

export function DeleteSpaceDialog({ studentId, space, onClose }: { studentId: string; space: Space | null; onClose: () => void }) {
  const [typed, setTyped] = useState('')
  const remove = useDeleteSpace(studentId)
  const error = remove.error ? errorMessage(remove.error, 'Could not delete the Study Space.') : null

  function close() {
    setTyped('')
    remove.reset()
    onClose()
  }

  function confirm() {
    if (space) remove.mutate(space.id, { onSuccess: close })
  }

  // Deleting cannot be undone, so the Student types the name to confirm.
  const matches = space !== null && typed.trim() === space.name

  return (
    <Dialog open={space !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex gap-3">
            <span className="grid size-9 flex-none place-items-center rounded-full bg-destructive/10 text-destructive" aria-hidden>
              <Trash2 className="size-4" />
            </span>
            <div className="flex flex-col gap-1">
              <DialogTitle>Delete the {space?.name} Space?</DialogTitle>
              <DialogDescription>
                This permanently removes everything in this Space: its notes, flashcards, topics and chats. It can’t be
                undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="delete-confirm">
            Type <span className="font-mono">{space?.name}</span> to confirm
          </Label>
          <Input id="delete-confirm" autoFocus autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!matches || remove.isPending} onClick={confirm}>
            Delete Space
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
