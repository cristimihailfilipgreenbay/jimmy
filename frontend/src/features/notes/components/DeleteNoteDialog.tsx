import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { errorMessage } from '@/lib/http'
import { toast } from '@/lib/toast'
import { useDeleteDocument } from '../queries/useDeleteDocument'
import type { Document } from '../schemas/document'

export function DeleteNoteDialog({
  studentId,
  spaceId,
  note,
  onClose,
}: {
  studentId: string
  spaceId: string
  note: Document | null
  onClose: () => void
}) {
  const remove = useDeleteDocument(studentId, spaceId)
  const error = remove.error ? errorMessage(remove.error, 'Could not delete the note.') : null

  function close() {
    remove.reset()
    onClose()
  }

  return (
    <Dialog open={note !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent role="alertdialog">
        {note && (
          <div className="p-5">
            <div className="flex gap-3">
              <span className="grid size-9 flex-none place-items-center rounded-full bg-destructive-soft text-destructive" aria-hidden>
                <Trash2 className="size-4" />
              </span>
              <div>
                <DialogTitle>Delete “{note.title}”?</DialogTitle>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Jimmy will stop using it in answers.</li>
                  <li>Topics Jimmy found in it stay in this Space.</li>
                </ul>
                {error && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-5">
              <Button variant="ghost" autoFocus onClick={close}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                disabledReason="Deleting…"
                onClick={() =>
                  remove.mutate(note.id, {
                    onSuccess: () => {
                      toast(`Deleted “${note.title}”`, Trash2)
                      close()
                    },
                  })
                }
              >
                Delete note
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
