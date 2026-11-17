import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { errorMessage } from '@/lib/http'
import { toast } from '@/lib/toast'
import { useDeleteTopic } from '../queries/useDeleteTopic'
import type { Topic } from '../schemas/topic'

export function DeleteTopicDialog({
  studentId,
  spaceId,
  topics,
  all,
  onClose,
  onDeleted,
}: {
  studentId: string
  spaceId: string
  /** The Topics to delete; empty keeps the dialog closed. */
  topics: Topic[]
  /** Set to delete every Topic of the Space (how many there are), whatever `topics` holds. */
  all?: number
  onClose: () => void
  /** Called once the Topics are deleted, before the dialog closes. */
  onDeleted?: () => void
}) {
  const remove = useDeleteTopic(studentId, spaceId)
  const error = remove.error ? errorMessage(remove.error, 'Could not delete the topic.') : null

  function close() {
    remove.reset()
    onClose()
  }

  return (
    <Dialog open={topics.length > 0 || !!all} onOpenChange={(o) => !o && close()}>
      <DialogContent role="alertdialog">
        {(topics.length > 0 || !!all) && (
          <div className="p-5">
            <div className="flex gap-3">
              <span className="grid size-9 flex-none place-items-center rounded-full bg-destructive-soft text-destructive" aria-hidden>
                <Trash2 className="size-4" />
              </span>
              <div>
                <DialogTitle>{all ? `Delete all ${all} topics?` : topics.length === 1 ? `Delete “${topics[0].name}”?` : `Delete ${topics.length} topics?`}</DialogTitle>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Jimmy will stop using {!all && topics.length === 1 ? 'it' : 'them'} for quizzes and weak-topic tracking.</li>
                  <li>
                    Flashcards, weak-topic records and past quiz questions about {!all && topics.length === 1 ? 'it' : 'them'} are deleted too.
                  </li>
                  <li>Your notes stay as they are.</li>
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
                  remove.mutate(all ? 'all' : topics.map((t) => t.id), {
                    onSuccess: () => {
                      onDeleted?.()
                      toast(all ? `Deleted all ${all} topics` : topics.length === 1 ? `Deleted “${topics[0].name}”` : `Deleted ${topics.length} topics`, Trash2)
                      close()
                    },
                  })
                }
              >
                {!all && topics.length === 1 ? 'Delete topic' : 'Delete topics'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
