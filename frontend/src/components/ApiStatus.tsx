import { useEffect, useState } from 'react'
import { getHealth } from '@/lib/api'

type State = 'checking' | 'ok' | 'down'

export function ApiStatus() {
  const [state, setState] = useState<State>('checking')

  useEffect(() => {
    let alive = true
    const check = () =>
      getHealth()
        .then((h) => alive && setState(h.status === 'ok' ? 'ok' : 'down'))
        .catch(() => alive && setState('down'))
    check()
    const id = setInterval(check, 10_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const label = { checking: 'Checking API…', ok: 'API healthy', down: 'API unavailable' }[state]
  const dot = { checking: 'bg-muted-foreground', ok: 'bg-green-600', down: 'bg-destructive' }[state]
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden />
      {label}
    </p>
  )
}
