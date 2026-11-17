import { useState, type FormEvent } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/http'
import { toast } from '@/lib/toast'
import { useRenameChat } from '../queries/useThreads'
import type { ThreadItem } from '../schemas/chat'

// Rename a chat. Leaving the name empty goes back to using the first question.
export function RenameChatDialog({ studentId, spaceId, chat, onClose }: { studentId: string; spaceId: string; chat: ThreadItem | null; onClose: () => void }) {
  return (
    <Dialog open={!!chat} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{chat && <RenameForm key={chat.id} studentId={studentId} spaceId={spaceId} chat={chat} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function RenameForm({ studentId, spaceId, chat, onClose }: { studentId: string; spaceId: string; chat: ThreadItem; onClose: () => void }) {
  const [name, setName] = useState(chat.title)
  const rename = useRenameChat(studentId, spaceId)
  const error = rename.error ? errorMessage(rename.error, 'Could not rename the chat.') : null

  function submit(e: FormEvent) {
    e.preventDefault()
    // Nothing changed: nothing to save. An empty name asks for the first question again.
    if (name.trim() === chat.title) return onClose()
    rename.mutate(
      { id: chat.id, title: name },
      {
        onSuccess: () => {
          onClose()
          toast('Chat renamed', Pencil)
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="p-5 sm:p-6">
      <DialogTitle className="text-lg font-semibold tracking-tight">Rename chat</DialogTitle>
      <label htmlFor="rename-chat" className="mt-4 mb-1.5 block text-sm font-medium">
        Chat name
      </label>
      <Input id="rename-chat" className="h-10 text-[15px]" value={name} maxLength={80} autoFocus onFocus={(e) => e.currentTarget.select()} onChange={(e) => setName(e.target.value)} />
      <p className="mt-1.5 text-xs text-muted-foreground">Leave it empty to use the first question again.</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter className="mt-6">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={rename.isPending}>
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}
