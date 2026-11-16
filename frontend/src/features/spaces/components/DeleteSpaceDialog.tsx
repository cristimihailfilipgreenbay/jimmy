import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { errorMessage } from '@/lib/http'
import type { Space } from '../queries/spaces'
import { useDeleteSpace } from '../queries/useDeleteSpace'

export function DeleteSpaceDialog({ studentId, space, onClose }: { studentId: string; space: Space | null; onClose: () => void }) {
  const remove = useDeleteSpace(studentId)
  const error = remove.error ? errorMessage(remove.error, 'Could not delete the Study Space.') : null

  function close() {
    remove.reset()
    onClose()
  }

  function confirm() {
    if (space) remove.mutate(space.id, { onSuccess: close })
  }

  return (
    <Dialog open={space !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{space?.name}”?</DialogTitle>
          <DialogDescription>
            This permanently deletes the Study Space and everything in it: Notes, Topics, conversations, Flashcards and
            Learned Material. It cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={remove.isPending} onClick={confirm}>
            Delete Study Space
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
