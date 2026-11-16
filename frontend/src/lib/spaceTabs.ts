import { GraduationCap, Layers, LayoutGrid, MessageSquare } from 'lucide-react'

// A Study Space's tabs, in the order they sit in the header.
export const SPACE_TABS = [
  { path: '', label: 'Dashboard', Icon: LayoutGrid },
  { path: '/chat', label: 'Chat', Icon: MessageSquare },
  { path: '/study', label: 'Study', Icon: GraduationCap },
  { path: '/flashcards', label: 'Flashcards', Icon: Layers },
]

/** Position of the tab a path belongs to (Dashboard 0 .. Flashcards 3), or -1 if it is not a Space tab. */
export const spaceTabIndex = (pathname: string, spaceId: string) =>
  SPACE_TABS.findIndex((t) => pathname === `/spaces/${spaceId}${t.path}`)

export type TabPosition = { spaceId?: string; tab: number }

/**
 * Which way the screen should slide when going from one place to another:
 * 'next' towards a later tab, 'prev' towards an earlier one, and null (a plain
 * fade) for anything that is not a move between two tabs of the same Space.
 */
export function tabDirection(from: TabPosition, to: TabPosition): 'next' | 'prev' | null {
  if (to.spaceId === undefined || from.spaceId !== to.spaceId) return null
  if (from.tab < 0 || to.tab < 0 || from.tab === to.tab) return null
  return to.tab > from.tab ? 'next' : 'prev'
}
