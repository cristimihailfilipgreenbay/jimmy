import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Animates its own height when its content changes size, as the sign-in card
 * does when you switch tabs. Respects reduced motion.
 */
export function AnimatedHeight({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>()

  useEffect(() => {
    const el = inner.current
    if (!el) return
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // The padding (offset by the negative margin) leaves room for focus rings,
  // which overflow-hidden would otherwise clip. It counts towards the height.
  return (
    <div
      style={{ height: height === undefined ? undefined : height + 8 }}
      className="-m-1 overflow-hidden p-1 transition-[height] duration-[320ms] ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none"
    >
      <div ref={inner} className="flow-root">
        {children}
      </div>
    </div>
  )
}
