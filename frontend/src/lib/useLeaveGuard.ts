import { useEffect } from 'react'

/**
 * While `active`, refreshing, closing the tab or typing another address asks the browser
 * to confirm first. (The browser shows its own message; the text cannot be changed.)
 * Moving between screens inside the app is not caught by this.
 */
export function useLeaveGuard(active: boolean) {
  useEffect(() => {
    if (!active) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Older browsers need a return value too.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])
}
