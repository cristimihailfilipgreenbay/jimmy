import { List, MoreHorizontal, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Above the messages: which chat is open, how long it is, and its menu and New chat. On a
// phone it also holds the button that opens the list of chats, and it stays under the app bar.
export function ChatHeader({
  title,
  subtitle,
  chatCount,
  canOpenMenu,
  newDisabled,
  onChats,
  onMenu,
  onNew,
}: {
  title: string
  subtitle: string
  chatCount: number
  canOpenMenu: boolean
  newDisabled: boolean
  onChats: () => void
  onMenu: (x: number, y: number, returnTo: HTMLElement) => void
  onNew: () => void
}) {
  return (
    <div className="sticky top-14 z-20 -mx-4 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:backdrop-blur-0">
      <Button variant="outline" size="sm" className="lg:hidden" aria-haspopup="dialog" onClick={onChats}>
        <List /> Chats
        <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{chatCount}</span>
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {canOpenMenu && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-haspopup="menu"
          aria-label="Options for this chat"
          onClick={(e) => {
            const box = e.currentTarget.getBoundingClientRect()
            onMenu(box.right - 240, box.bottom + 6, e.currentTarget)
          }}
        >
          <MoreHorizontal />
        </Button>
      )}
      <Button variant="outline" size="sm" disabled={newDisabled} aria-label="New chat" onClick={onNew}>
        <Plus />
        <span className="hidden sm:inline">New chat</span>
      </Button>
    </div>
  )
}
