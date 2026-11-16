import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Check, GraduationCap, Layers, LayoutGrid, MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { MenuSurface } from '@/components/MenuSurface'
import { cn } from '@/lib/utils'
import { ACCENTS, accentInfo, accentStyle } from '../lib/accents'
import type { Accent, Space } from '../schemas/space'

const WIDTH = 284 // 17.75rem
const MARGIN = 8
const ESTIMATED_HEIGHT = 340

const itemClass =
  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left hover:bg-muted focus:bg-muted focus:outline-none'

function Item({ icon, children, onClick, destructive }: { icon: ReactNode; children: ReactNode; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      className={cn(itemClass, destructive && 'text-destructive hover:bg-destructive-soft focus:bg-destructive-soft')}
    >
      <span className="opacity-70" aria-hidden>
        {icon}
      </span>
      {children}
    </button>
  )
}

/**
 * The Study Space menu from the design. It opens at the pointer (right-click,
 * long-press) or under the "⋯" button, and offers the Space's screens, rename,
 * a colour change and delete.
 */
export function SpaceContextMenu({
  space,
  x,
  y,
  returnTo,
  onClose,
  onRename,
  onDelete,
  onColour,
}: {
  space: Space
  x: number
  y: number
  returnTo: HTMLElement | null
  onClose: () => void
  onRename: () => void
  onDelete: () => void
  onColour: (accent: Accent) => void
}) {
  const navigate = useNavigate()
  const box = useRef<HTMLDivElement>(null)
  const openUp = y + ESTIMATED_HEIGHT > innerHeight - MARGIN

  // Keep it on screen: pull it in from the right edge, and flip it above the pointer near the bottom.
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const { offsetWidth: w, offsetHeight: h } = el
    el.style.left = `${Math.max(MARGIN, Math.min(x, innerWidth - w - MARGIN))}px`
    el.style.top = `${y + h > innerHeight - MARGIN ? Math.max(MARGIN, y - h) : y}px`
  }, [x, y])

  const go = (path: string) => navigate(`/spaces/${space.id}${path}`)
  const accent = accentInfo(space.accent)

  return (
    <div ref={box} style={{ left: x, top: y, width: WIDTH }} className="fixed z-[75]">
      <MenuSurface
        up={openUp}
        label={`${space.name} options`}
        returnFocus={() => returnTo}
        closeOnScroll
        onClose={onClose}
        className="w-full rounded-lg border bg-card p-1 text-sm shadow-xl"
      >
        <p className="truncate px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground" style={accentStyle(space.accent)}>
          <span className="mr-1.5 inline-block size-2 rounded-full bg-space align-middle" />
          {space.name}
        </p>
        <Item icon={<LayoutGrid className="size-4" />} onClick={() => go('')}>
          Open dashboard
        </Item>
        <Item icon={<MessageSquare className="size-4" />} onClick={() => go('/chat')}>
          Ask Jimmy
        </Item>
        <Item icon={<GraduationCap className="size-4" />} onClick={() => go('/study')}>
          Start a quiz
        </Item>
        <Item icon={<Layers className="size-4" />} onClick={() => go('/flashcards')}>
          Flashcards
        </Item>
        <div role="separator" className="my-1 border-t" />
        <Item icon={<Pencil className="size-4" />} onClick={onRename}>
          Rename…
        </Item>
        <div className="px-2.5 py-1.5">
          <p className="mb-1.5 text-xs text-muted-foreground">
            Colour · <span className="text-foreground">{accent.label}</span>
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Colour">
            {ACCENTS.map((a) => {
              const on = a.value === space.accent
              return (
                <button
                  key={a.value}
                  type="button"
                  role="menuitemradio"
                  tabIndex={-1}
                  aria-checked={on}
                  aria-label={a.label}
                  title={a.label}
                  onClick={() => onColour(a.value)}
                  style={accentStyle(a.value)}
                  className={cn(
                    'grid size-5 place-items-center rounded-full bg-space text-white ring-offset-2 ring-offset-card transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    on && 'ring-2 ring-space',
                  )}
                >
                  {on && <Check className="size-3" />}
                </button>
              )
            })}
          </div>
        </div>
        <div role="separator" className="my-1 border-t" />
        <Item destructive icon={<Trash2 className="size-4" />} onClick={onDelete}>
          Delete Space…
        </Item>
      </MenuSurface>
    </div>
  )
}
