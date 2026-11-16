import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  onClose: () => void
  /** Opens upwards (grows from its bottom edge). */
  up?: boolean
  className?: string
  style?: CSSProperties
  label?: string
  /** Clicks on this element do not count as "outside" (the menu's own button). */
  anchorRef?: RefObject<HTMLElement | null>
  /** The element that gets focus back when the menu is dismissed with Escape or Tab. */
  returnFocus?: () => HTMLElement | null | undefined
  closeOnScroll?: boolean
  children: ReactNode
}

const ITEMS = '[role^=menuitem]'

/**
 * The design's menu behaviour: it drops in, focus goes to its first item, the
 * arrow keys, Home and End move between items, and Escape, Tab, a click outside
 * (or scrolling, for pop-up menus) close it with a short fade.
 */
export function MenuSurface({ onClose, up = false, className, style, label, anchorRef, returnFocus, closeOnScroll = false, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)

  const close = useCallback(
    (restoreFocus: boolean) => {
      setClosing(true)
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
      window.setTimeout(() => {
        onClose()
        if (restoreFocus) returnFocus?.()?.focus?.()
      }, reduceMotion ? 0 : 150)
    },
    [onClose, returnFocus],
  )

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(ITEMS)?.focus()
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || anchorRef?.current?.contains(target)) return
      close(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault()
        close(true)
      }
    }
    const onScroll = () => closeOnScroll && close(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onScroll)
    }
  }, [anchorRef, close, closeOnScroll])

  function onKeyDown(e: React.KeyboardEvent) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [])].filter((el) => el.offsetParent !== null)
    const at = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : e.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length
    items[next]?.focus()
  }

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      style={style}
      onKeyDown={onKeyDown}
      // Choosing an item closes the menu.
      onClick={(e) => (e.target as HTMLElement).closest(ITEMS) && close(false)}
      className={cn(closing ? (up ? 'menu-out-up' : 'menu-out') : up ? 'menu-pop-up' : 'menu-pop', className)}
    >
      {children}
    </div>
  )
}
