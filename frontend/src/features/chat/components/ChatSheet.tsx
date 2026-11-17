import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

// The list of chats on a phone or a tablet: a bottom sheet over the chat.
export function ChatSheet({ open, spaceName, onClose, children }: { open: boolean; spaceName: string; onClose: () => void; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <DialogTitle>Chats in {spaceName}</DialogTitle>
            <Button variant="ghost" size="icon-sm" className="-mr-2" aria-label="Close" onClick={onClose}>
              <X />
            </Button>
          </div>
          <div className="[&>div]:border-0 [&>div]:p-0 [&>div]:shadow-none">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
