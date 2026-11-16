import { useHealth } from '../queries/useHealth'

export function ApiStatus() {
  const { data, isPending, isError } = useHealth()
  const state = isPending ? 'checking' : isError || data?.status !== 'ok' ? 'down' : 'ok'

  const label = { checking: 'Checking API…', ok: 'API healthy', down: 'API unavailable' }[state]
  const dot = { checking: 'bg-muted-foreground', ok: 'bg-green-600', down: 'bg-destructive' }[state]
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden />
      {label}
    </p>
  )
}
