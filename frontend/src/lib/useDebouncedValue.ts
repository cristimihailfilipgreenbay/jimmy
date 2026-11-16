import { useEffect, useState } from 'react'

/** `value`, but only after it has stopped changing for `ms`. */
export function useDebouncedValue<T>(value: T, ms = 250): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms)
    return () => window.clearTimeout(timer)
  }, [value, ms])
  return settled
}
