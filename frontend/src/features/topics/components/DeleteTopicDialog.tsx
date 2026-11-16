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
  topic,
  onClose,
}: {
  studentId: string
  spaceId: string
  topic: Topic | null
  onClose: () => void
}) {
  const remove = useDeleteTopic(studentId, spaceId)
  const error = remove.error ? errorMessage(remove.error, 'Could not delete the topic.') : null

  function close() {
    remove.reset()
    onClose()
  }

  return (
    <Dialog open={topic !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent role="alertdialog">
        {topic && (
          <div className="p-5">
            <div className="flex gap-3">
              <span className="grid size-9 flex-none place-items-center rounded-full bg-destructive-soft text-destructive" aria-hidden>
                <Trash2 className="size-4" />
              </span>
              <div>
                <DialogTitle>Delete “{topic.name}”?</DialogTitle>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Jimmy will stop using it for quizzes and weak-topic tracking.</li>
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
                onClick={() =>
                  remove.mutate(topic.id, {
                    onSuccess: () => {
                      toast(`Deleted “${topic.name}”`, Trash2)
                      close()
                    },
                  })
                }
              >
                Delete topic
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
