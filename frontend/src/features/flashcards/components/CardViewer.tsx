import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CitationChip } from '@/features/chat/components/CitationChip'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import type { Card } from '../schemas/flashcards'

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// How the cards sit in the carousel: the current one in the middle, its neighbours
// smaller and faded to each side. Moving only changes these numbers, and CSS eases them.
const GAP = 20
const place = (offset: number) => ({
  transform: `translateX(calc(${offset * 100}% + ${offset * GAP}px)) scale(${offset === 0 ? 1 : 0.86})`,
  opacity: offset === 0 ? 1 : Math.abs(offset) === 1 ? 0.25 : 0,
  filter: offset === 0 ? 'none' : 'blur(3px)',
  zIndex: 10 - Math.abs(offset),
})

// The buttons below the card change with its side. Each group's width eases between its
// full size and nothing, so the row widens and shrinks instead of jumping.
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('grid transition-[grid-template-columns] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none', open ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]')}>
      <div className={cn('min-w-0 overflow-hidden px-1 transition-opacity duration-200 motion-reduce:transition-none', open ? 'opacity-100' : 'opacity-0')} inert={!open}>
        {children}
      </div>
    </div>
  )
}

// The deck, one card at a time: click or press Space to flip, arrows or a swipe to move.
export function CardViewer({ cards, start, onClose }: { cards: Card[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(Math.min(start, cards.length - 1))
  const [flipped, setFlipped] = useState(false)
  // 'on' / 'off' play the flip animation.
  const [anim, setAnim] = useState<'on' | 'off' | null>(null)
  const busy = useRef(false)
  const touchX = useRef<number | null>(null)

  const flip = () => {
    if (busy.current) return
    const on = !flipped
    setFlipped(on)
    if (reduceMotion()) return
    busy.current = true
    setAnim(on ? 'on' : 'off')
    setTimeout(() => {
      busy.current = false
      setAnim(null)
      document.querySelector<HTMLElement>(on ? '[data-rate=good]' : '[data-flip]')?.focus()
    }, 570)
  }
  const move = (to: number) => {
    if (to === index || to < 0 || to >= cards.length) return
    setIndex(to)
    setFlipped(false)
    setAnim(null)
  }
  // Again and Hard turn the card back to its front; Got it moves on. Nothing is stored yet.
  const again = () => flip()
  const gotIt = () => move(index + 1)

  // Keys while the viewer is open (not while typing).
  const keys = useRef({ flip, move, again, gotIt, flipped, index })
  useEffect(() => {
    keys.current = { flip, move, again, gotIt, flipped, index }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      const k = keys.current
      if (e.key === ' ') {
        e.preventDefault()
        k.flip()
      } else if (e.key === 'ArrowRight') k.move(k.index + 1)
      else if (e.key === 'ArrowLeft') k.move(k.index - 1)
      else if (k.flipped && (e.key === '1' || e.key === '2')) k.again()
      else if (k.flipped && e.key === '3') k.gotIt()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const ease = reduceMotion() ? undefined : 'transform .5s cubic-bezier(.22,.8,.24,1), opacity .4s ease, filter .4s ease'

  return (
    <main id="main" className="overflow-x-clip py-6 pb-28">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-4 flex items-center">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={onClose}>
            <ArrowLeft /> All cards
          </Button>
          <span className="ml-auto text-sm text-muted-foreground" aria-live="polite">
            Card {index + 1} of {cards.length}
          </span>
        </div>
        <div
          className="relative h-80"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            touchX.current = null
            if (Math.abs(dx) > 50) move(index + (dx < 0 ? 1 : -1))
          }}
        >
          {cards.map((card, k) => {
            const offset = k - index
            // Only the current card and its neighbours are on the page.
            if (Math.abs(offset) > 2) return null
            const current = offset === 0
            return (
              <div key={card.id} className="absolute inset-0" style={{ ...place(offset), transition: ease }}>
                <div className="h-full" inert={!current} aria-hidden={!current || undefined}>
                  <div className={cn('flip h-full', current && flipped && 'is-flipped', current && anim && `anim-${anim}`)}>
                    <span className="flip-shadow pointer-events-none absolute inset-x-10 -bottom-3 h-6 rounded-[50%] bg-black/10 opacity-0 blur-md" aria-hidden />
                    <div className="flip-inner">
                      <button
                        type="button"
                        data-flip={current || undefined}
                        onClick={flip}
                        className={cn('flip-face flex flex-col p-6 text-left', cardClass)}
                        aria-label={`Card front: ${card.front}. Press to show answer.`}
                        tabIndex={current && flipped ? -1 : undefined}
                        aria-hidden={(current && flipped) || undefined}
                      >
                        <span className="text-xs text-muted-foreground">{card.topic} · Question</span>
                        <span className="flex flex-1 items-center justify-center text-center font-serif text-2xl leading-snug">{card.front}</span>
                        <span className="text-center text-xs text-muted-foreground">Space or click to flip</span>
                      </button>
                      <div
                        className="flip-face flip-back flex flex-col overflow-hidden rounded-lg border border-border bg-card p-6 shadow-[0_1px_2px_rgba(20,20,30,.04)]"
                        aria-hidden={current && flipped ? undefined : true}
                        inert={!(current && flipped)}
                      >
                        <span className="pointer-events-none absolute inset-0 bg-space/[.06]" aria-hidden />
                        <span className="relative text-xs font-semibold text-space-ink/80">{card.topic} · Answer</span>
                        <p className="relative flex flex-1 items-center justify-center text-center font-serif text-2xl leading-snug">{card.back}</p>
                        <div className="relative flex items-center justify-center">
                          <CitationChip citation={{ id: k + 1, ...card.source }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* A neighbour is a button: click it to bring it to the middle. */}
                {Math.abs(offset) === 1 && (
                  <button type="button" tabIndex={-1} aria-hidden className="absolute inset-0 z-20 rounded-lg" onClick={() => move(k)} />
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-5 flex items-center justify-center gap-1.5" role="group" aria-label="Cards">
          {cards.map((c, k) => (
            <button
              key={c.id}
              type="button"
              onClick={() => move(k)}
              aria-label={`Go to card ${k + 1}`}
              aria-current={k === index || undefined}
              className={cn('h-1.5 rounded-full transition-all duration-300', k === index ? 'w-6 bg-space' : 'w-1.5 bg-border hover:bg-muted-foreground/40')}
            />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-center">
          <Button variant="outline" size="icon" className="mx-1" aria-label="Previous card" disabled={index === 0} onClick={() => move(index - 1)}>
            <ArrowLeft />
          </Button>
          <Collapse open={!flipped}>
            <Button variant="space" data-flip onClick={flip} className="whitespace-nowrap">
              <Layers /> Show answer
            </Button>
          </Collapse>
          <Collapse open={flipped}>
            <div className="flex gap-2">
              <Button variant="outline" onClick={again}>
                Again
              </Button>
              <Button variant="outline" onClick={again}>
                Hard
              </Button>
              <Button variant="space" data-rate="good" onClick={gotIt}>
                Got it
              </Button>
            </div>
          </Collapse>
          <Button variant="outline" size="icon" className="mx-1" aria-label="Next card" disabled={index === cards.length - 1} onClick={() => move(index + 1)}>
            <ArrowRight />
          </Button>
        </div>
        <p className="mt-3 hidden text-center text-xs text-muted-foreground md:block">Keys: Space flip · ← → move · 1 Again · 2 Hard · 3 Got it</p>
        <p className="mt-3 text-center text-xs text-muted-foreground md:hidden">Tap the card to flip · swipe to move</p>
      </div>
    </main>
  )
}
