import { Layers } from 'lucide-react'
import { ShowMore } from '@/components/ShowMore'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import type { Card } from '../schemas/flashcards'

const topicClass = (on: boolean) =>
  cn('rounded-full border px-3 py-1 text-xs transition-colors duration-200', on ? 'border-space bg-space-soft text-space-ink' : 'border-border bg-card text-foreground hover:bg-muted')

// The approved cards loaded so far, for one Topic or all (the server filters). A card opens the
// viewer at its place in the deck; more cards load on request.
export function DeckGrid({
  cards,
  total,
  topics,
  topic,
  hasMore,
  loadingMore,
  onMore,
  onTopic,
  onOpen,
}: {
  cards: Card[]
  total: number
  topics: { id: string; name: string }[]
  topic: string
  hasMore: boolean
  loadingMore: boolean
  onMore: () => void
  onTopic: (id: string) => void
  onOpen: (card: Card) => void
}) {
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
        {[{ id: 'all', name: 'All topics' }, ...topics].map((t) => (
          <button key={t.id} type="button" className={topicClass(topic === t.id)} aria-pressed={topic === t.id} onClick={() => onTopic(t.id)}>
            {t.name}
          </button>
        ))}
      </div>
      <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
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
      <ShowMore shown={cards.length} total={total} hasMore={hasMore} loading={loadingMore} onMore={onMore} />
    </>
  )
}

