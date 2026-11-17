import { useState } from 'react'
import { Layers, X } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Placeholder } from '@/components/Placeholder'
import { Button } from '@/components/ui/button'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { useSpace } from '@/features/spaces/queries/useSpace'
import { cardClass } from '@/lib/styles'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useSlidingIndicator } from '@/lib/useSlidingIndicator'
import { CardViewer } from './components/CardViewer'
import { DeckGrid } from './components/DeckGrid'
import { ReviewQueue } from './components/ReviewQueue'
import { StyleNotice } from './components/StyleNotice'
import { useDeck, useDrafts, useReviewDraft } from './queries/useFlashcards'
import type { CardDecision, Draft } from './schemas/flashcards'

type Tab = 'browse' | 'review'

// A Study Space's Flashcards: the approved deck, the drafts waiting for review, and a
// viewer to flip through the deck.
export function FlashcardsPage() {
  const { spaceId = '' } = useParams()
  const student = useSignedInStudent()
  const { data: space, isPending } = useSpace(student.id, spaceId)
  // The tab and the Topic filter live in the address (?tab=review&topic=…), so they survive a
  // refresh and can be linked to.
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'review' ? 'review' : 'browse'
  const asked = params.get('topic')
  const topic = asked && z.uuid().safeParse(asked).success ? asked : 'all'
  const change = (key: 'tab' | 'topic', value: string | null) =>
    setParams(
      (old) => {
        const next = new URLSearchParams(old)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  const setTab = (next: Tab) => change('tab', next === 'browse' ? null : next)
  const setTopic = (id: string) => change('topic', id === 'all' ? null : id)
  const deck = useDeck(student.id, spaceId, topic)
  const drafts = useDrafts(student.id, spaceId)
  const review = useReviewDraft(student.id, spaceId)
  const [viewer, setViewer] = useState<number | null>(null)
  // The tabs are not on the page while the lists load or the viewer is open, so the pill is
  // only placed once they are: the key changes then, and the hook measures them.
  const tabsShown = !!space && !deck.isPending && !drafts.isPending && viewer === null && (deck.data?.totalAll || drafts.data?.total)
  const { container, indicator } = useSlidingIndicator<HTMLDivElement>(tabsShown ? tab : '')
  if (isPending || deck.isPending || drafts.isPending) return null
  if (!space) return <Placeholder title="Study Space not found" note="That Study Space does not exist." />

  const cards = deck.data?.cards ?? []
  const waiting = drafts.data?.drafts ?? []
  const deckTotal = deck.data?.totalAll ?? 0
  const draftsTotal = drafts.data?.total ?? 0
  const frame = (children: React.ReactNode) => (
    <main id="main" className="mx-auto max-w-4xl px-4 py-8 pb-28">
      {children}
    </main>
  )

  if (!deckTotal && !draftsTotal) {
    return frame(
      <div className={`${cardClass} px-6 py-12 text-center`}>
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-muted">
          <Layers className="size-5" aria-hidden />
        </span>
        <p className="mt-3 font-semibold">No flashcards yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Jimmy drafts cards from your notes and chats. You approve each one before it joins your deck.</p>
      </div>,
    )
  }
  if (viewer !== null && cards.length) {
    return (
      <CardViewer
        cards={cards}
        total={deck.data?.total ?? cards.length}
        hasMore={!!deck.hasNextPage}
        loadingMore={deck.isFetchingNextPage}
        onMore={() => deck.fetchNextPage()}
        start={viewer}
        onClose={() => setViewer(null)}
      />
    )
  }

  const decide = (draft: Draft, decision: CardDecision) =>
    review.mutate(
      { draft, decision },
      {
        onSuccess: () =>
          decision.action === 'approve' ? toast('Added to your deck', Layers) : decision.action === 'edit' ? toast('Edited and added to your deck', Layers) : toast('Draft rejected', X),
      },
    )

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-6 pb-28">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
          <p className="text-sm text-muted-foreground">
            {deckTotal} in your deck · {draftsTotal} drafts to review
          </p>
        </div>
        <Button variant="space" disabled={!cards.length} onClick={() => setViewer(0)}>
          <Layers /> Study deck
        </Button>
      </div>
      <StyleNotice studentId={student.id} />
      <div ref={container} role="tablist" aria-label="Flashcard views" className="relative mb-5 inline-flex rounded-lg bg-muted p-1">
        <span ref={indicator} aria-hidden className="pointer-events-none absolute top-0 left-0 rounded-md bg-card shadow-sm" />
        {(
          [
            ['browse', 'Browse deck'],
            ['review', `Review drafts (${draftsTotal})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            data-ind-target
            data-active={tab === key}
            onClick={() => setTab(key)}
            className={cn('relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200', tab === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="fade-in" key={tab}>
        {tab === 'browse' ? (
          <DeckGrid
            cards={cards}
            total={deck.data?.total ?? 0}
            topics={deck.data?.topics ?? []}
            topic={topic}
            hasMore={!!deck.hasNextPage}
            loadingMore={deck.isFetchingNextPage}
            onMore={() => deck.fetchNextPage()}
            onTopic={setTopic}
            onOpen={(c) => setViewer(Math.max(0, cards.findIndex((s) => s.id === c.id)))}
          />
        ) : (
          <ReviewQueue
            drafts={waiting}
            total={draftsTotal}
            hasMore={!!drafts.hasNextPage}
            loadingMore={drafts.isFetchingNextPage}
            onMore={() => drafts.fetchNextPage()}
            deciding={review.isPending}
            error={review.error}
            onDecide={decide}
          />
        )}
      </div>
    </main>
  )
}
