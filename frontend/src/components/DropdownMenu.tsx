import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

/** A button and the menu it opens. Closes on outside click, Escape or choosing an item. */
export function DropdownMenu({
  trigger,
  children,
  align = 'left',
  className,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger: (menu: { open: boolean; toggle: () => void }) => ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
  /** Pass both to control the menu from outside (for example, to open it on right-click). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [ownOpen, setOwnOpen] = useState(false)
  const open = controlledOpen ?? ownOpen
  const setOpen = (value: boolean | ((current: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(open) : value
    setOwnOpen(next)
    onOpenChange?.(next)
  }
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            'menu-pop absolute top-10 z-50 rounded-lg border bg-card p-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

const item = 'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted'

export function MenuLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link role="menuitem" to={to} className={cn(item, className)}>
      {children}
    </Link>
  )
}

export function MenuButton({
  onClick,
  destructive = false,
  disabled,
  children,
}: {
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(item, destructive && 'text-destructive hover:bg-destructive-soft')}
    >
      {children}
    </button>
  )
}

export const MenuDivider = () => <div role="separator" className="my-1 border-t" />
