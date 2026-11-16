import { Layers } from 'lucide-react'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import type { Card } from '../schemas/flashcards'

const topicClass = (on: boolean) =>
  cn('rounded-full border px-3 py-1 text-xs transition-colors duration-200', on ? 'border-space bg-space-soft text-space-ink' : 'border-border bg-card text-foreground hover:bg-muted')

// The approved cards, filtered by Topic. A card opens the viewer at its place in the deck.
export function DeckGrid({ cards, topic, onTopic, onOpen }: { cards: Card[]; topic: string; onTopic: (t: string) => void; onOpen: (card: Card) => void }) {
  const topics = ['all', ...new Set(cards.map((c) => c.topic))]
  const shown = cards.filter((c) => topic === 'all' || c.topic === topic)
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
        {topics.map((t) => (
          <button key={t} type="button" className={topicClass(topic === t)} aria-pressed={topic === t} onClick={() => onTopic(t)}>
            {t === 'all' ? 'All topics' : t}
          </button>
        ))}
      </div>
      <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <li key={c.id} className="fade-in">
            <button
              type="button"
              onClick={() => onOpen(c)}
              className={cn('flex h-full min-h-[150px] w-full flex-col p-4 text-left transition hover:border-space/40 hover:shadow-md', cardClass)}
            >
              <span className="text-xs text-muted-foreground">{c.topic}</span>
              <span className="mt-2 flex-1 font-serif text-lg leading-snug">{c.front}</span>
              <span className="mt-3 flex items-center justify-between gap-2">
                {/* The chip is a label here: the whole card is the button. */}
                <span className="truncate text-xs">
                  <span className={cn('chip', c.source.source_type === 'library' ? 'chip-lib' : c.source.source_type === 'notes' ? 'chip-notes' : 'chip-web')}>
                    <span>{c.source.page_or_section ? `${c.source.document}, ${c.source.page_or_section}` : c.source.document}</span>
                  </span>
                </span>
                <Layers className="size-4 flex-none text-muted-foreground" aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

