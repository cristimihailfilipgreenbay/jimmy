import { MoreHorizontal, Plus } from 'lucide-react'
import { ShowMore } from '@/components/ShowMore'
import { Button } from '@/components/ui/button'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { chatGroup, chatWhen } from '../lib/chatDates'
import type { ThreadItem } from '../schemas/chat'

// The Space's chats, newest first and grouped by day, with a New chat button on top. It is
// the right column of the Chat screen and the sheet that opens on a phone.
export function ChatList({
  chats,
  total,
  loading,
  hasMore,
  loadingMore,
  onMore,
  openId,
  draft,
  busy,
  scroll,
  onOpen,
  onNew,
  onMenu,
}: {
  chats: ThreadItem[]
  total: number
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  onMore: () => void
  /** The chat that is open. */
  openId: string | undefined
  /** A new chat that has no message yet is open. */
  draft: boolean
  /** Jimmy is answering: the Student stays in this chat until it is done. */
  busy: boolean
  /** Scroll inside the list (the side column), else the sheet scrolls. */
  scroll: boolean
  onOpen: (id: string) => void
  onNew: () => void
  onMenu: (chat: ThreadItem, x: number, y: number, returnTo: HTMLElement | null) => void
}) {
  const top = (
    <Button variant="outline" size="sm" className="mb-2 w-full" disabled={draft || busy} onClick={onNew}>
      <Plus /> New chat
    </Button>
  )
  if (loading) {
    return (
      <div className={cn(cardClass, 'p-2')}>
        {top}
        <ul className="space-y-1" aria-busy="true" aria-label="Loading chats">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <li key={i} className="px-3 py-2">
              <div className="skel h-3.5 w-4/5 rounded" />
              <div className="skel mt-2 h-2.5 w-2/5 rounded" />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const groups: { label: string; items: ThreadItem[] }[] = []
  for (const chat of chats) {
    const label = chatGroup(chat.updated_at)
    const group = groups.at(-1)
    if (group?.label === label) group.items.push(chat)
    else groups.push({ label, items: [chat] })
  }
  // The "No earlier chats" note shows while the open chat is the only one.
  const earlier = chats.filter((c) => c.id !== openId).length

  return (
    <div className={cn(cardClass, 'p-2')}>
      {top}
      <div className={cn('scroll-thin overflow-y-auto', scroll && 'max-h-[calc(100vh-12.5rem)]')}>
        {draft && (
          <>
            <p className="px-3 pt-1 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Now</p>
            <ul>
              <li>
                <div aria-current="true" className="relative flex w-full flex-col rounded-lg bg-space/13 py-2 pr-10 pl-3 text-left">
                  <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-space" aria-hidden />
                  <span className="block truncate text-sm font-semibold text-space-ink italic">New chat</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Not started yet<span className="sr-only"> (open)</span>
                  </span>
                </div>
              </li>
            </ul>
          </>
        )}
        {groups.map((group, g) => (
          <div key={group.label}>
            <p className={cn('px-3 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase', g === 0 && !draft ? 'pt-1' : 'pt-3')}>{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((chat) => (
                <ChatRow key={chat.id} chat={chat} active={chat.id === openId && !draft} busy={busy} onOpen={() => onOpen(chat.id)} onMenu={onMenu} />
              ))}
            </ul>
          </div>
        ))}
        {!earlier && (
          <div className="mx-1 mt-3 mb-1 rounded-lg border border-dashed border-border px-3 py-4 text-center">
            <p className="text-sm font-medium">No earlier chats</p>
            <p className="mt-0.5 text-xs text-muted-foreground">When you start a new chat, this one stays here so you can come back to it.</p>
          </div>
        )}
        <ShowMore shown={chats.length} total={total} hasMore={hasMore} loading={loadingMore} onMore={onMore} />
      </div>
    </div>
  )
}

function ChatRow({
  chat,
  active,
  busy,
  onOpen,
  onMenu,
}: {
  chat: ThreadItem
  active: boolean
  busy: boolean
  onOpen: () => void
  onMenu: (chat: ThreadItem, x: number, y: number, returnTo: HTMLElement | null) => void
}) {
  const n = chat.message_count
  return (
    <li
      className="group/row relative"
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu(chat, e.clientX, e.clientY, e.currentTarget.querySelector('button'))
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={busy && !active}
        aria-current={active ? 'true' : undefined}
        className={cn('relative flex w-full flex-col rounded-lg py-2 pr-10 pl-3 text-left transition-colors duration-200 disabled:opacity-60', active ? 'bg-space/13' : 'hover:bg-space/5')}
      >
        {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-space" aria-hidden />}
        <span className={cn('block truncate text-sm', active ? 'font-semibold text-space-ink' : 'font-medium')}>{chat.title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {chatWhen(chat.updated_at)} · {n} message{n === 1 ? '' : 's'}
          {active && <span className="sr-only"> (open)</span>}
        </span>
      </button>
      <button
        type="button"
        aria-haspopup="menu"
        aria-label={`Options for chat: ${chat.title}`}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          onMenu(chat, box.right - 240, box.bottom + 6, e.currentTarget)
        }}
        className={cn(
          'absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-opacity duration-200 hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100',
          active ? 'opacity-100' : 'opacity-0',
        )}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
    </li>
  )
}
