import { useLayoutEffect, useRef } from 'react'

/**
 * A tinted pill that slides to whichever tab is active, as in the design. The
 * container holds the tabs (marked `data-ind-target`, the active one also
 * `data-active="true"`) and the indicator element, which is positioned over the
 * active tab. It moves smoothly on change and jumps into place on first render
 * and on resize.
 */
export function useSlidingIndicator<T extends HTMLElement>(activeKey: string) {
  const container = useRef<T>(null)
  const indicator = useRef<HTMLSpanElement>(null)
  const placedOnce = useRef(false)

  useLayoutEffect(() => {
    const c = container.current
    const ind = indicator.current
    if (!c || !ind) return

    const place = (animate: boolean) => {
      const target = c.querySelector<HTMLElement>('[data-ind-target][data-active="true"]')
      if (!target) {
        ind.style.opacity = '0'
        return
      }
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
      const from = c.getBoundingClientRect()
      const to = target.getBoundingClientRect()
      ind.style.transition =
        animate && !reduceMotion
          ? 'left .28s cubic-bezier(.3,.7,.2,1), width .28s cubic-bezier(.3,.7,.2,1), top .28s'
          : 'none'
      ind.style.opacity = ''
      ind.style.left = `${to.left - from.left - c.clientLeft}px`
      ind.style.top = `${to.top - from.top - c.clientTop}px`
      ind.style.width = `${to.width}px`
      ind.style.height = `${to.height}px`
    }

    place(placedOnce.current)
    placedOnce.current = true
    const observer = new ResizeObserver(() => place(false))
    observer.observe(c)
    return () => observer.disconnect()
  }, [activeKey])

  return { container, indicator }
}
