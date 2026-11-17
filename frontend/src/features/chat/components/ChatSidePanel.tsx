import type { ReactNode } from 'react'
import { SegmentedControl } from '@/components/SegmentedControl'

export type Side = 'chats' | 'sources'

// The right column of the Chat screen on wide screens: the chats, or the guide to the sources.
export function ChatSidePanel({ side, onSide, chatCount, chats, sources }: { side: Side; onSide: (s: Side) => void; chatCount: number; chats: ReactNode; sources: ReactNode }) {
  return (
    <aside className="hidden lg:block" aria-label="Chats and sources">
      <div className="sticky top-20">
        <div className="mb-3">
          <SegmentedControl
            label="Side panel"
            value={side}
            onChange={onSide}
            options={[
              { value: 'chats', label: `Chats ${chatCount}` },
              { value: 'sources', label: 'Sources' },
            ]}
          />
        </div>
        <div className="fade-in" key={side}>
          {side === 'chats' ? chats : sources}
        </div>
      </div>
    </aside>
  )
}
