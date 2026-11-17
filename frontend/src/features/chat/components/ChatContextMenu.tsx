import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { MenuSurface } from '@/components/MenuSurface'
import { cn } from '@/lib/utils'
import type { ThreadItem } from '../schemas/chat'

const WIDTH = 240 // 15rem
const MARGIN = 8
const ESTIMATED_HEIGHT = 130

const itemClass = 'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left hover:bg-muted focus:outline-none focus-visible:bg-muted'

function Item({ icon, children, onClick, destructive }: { icon: ReactNode; children: ReactNode; onClick: () => void; destructive?: boolean }) {
  return (
    <button type="button" role="menuitem" tabIndex={-1} onClick={onClick} className={cn(itemClass, destructive && 'text-destructive hover:bg-destructive-soft focus-visible:bg-destructive-soft')}>
      <span className="opacity-70" aria-hidden>
        {icon}
      </span>
      {children}
    </button>
  )
}

// A chat's menu: Rename and Delete. It opens at the pointer (right-click) or under a "⋯" button.
export function ChatContextMenu({
  chat,
  x,
  y,
  returnTo,
  onClose,
  onRename,
  onDelete,
}: {
  chat: Pick<ThreadItem, 'title'>
  x: number
  y: number
  returnTo: HTMLElement | null
  onClose: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const openUp = y + ESTIMATED_HEIGHT > innerHeight - MARGIN

  // Keep it on screen: pull it in from the right edge, and flip it above near the bottom.
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const { offsetWidth: w, offsetHeight: h } = el
    el.style.left = `${Math.max(MARGIN, Math.min(x, innerWidth - w - MARGIN))}px`
    el.style.top = `${y + h > innerHeight - MARGIN ? Math.max(MARGIN, y - h) : y}px`
  }, [x, y])

  return (
    <div ref={box} style={{ left: x, top: y, width: WIDTH }} className="fixed z-[75]">
      <MenuSurface up={openUp} label="Chat options" returnFocus={() => returnTo} closeOnScroll onClose={onClose} className="w-full rounded-lg border bg-card p-1 text-sm shadow-xl">
        <p className="truncate px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">{chat.title}</p>
        <Item icon={<Pencil className="size-4" />} onClick={onRename}>
          Rename…
        </Item>
        <div role="separator" className="my-1 border-t" />
        <Item destructive icon={<Trash2 className="size-4" />} onClick={onDelete}>
          Delete chat…
        </Item>
      </MenuSurface>
    </div>
  )
}
