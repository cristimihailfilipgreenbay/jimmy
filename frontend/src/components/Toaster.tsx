import { useEffect, useState, useSyncExternalStore } from 'react'
import { Check } from 'lucide-react'
import { dismissToast, getToasts, subscribeToasts, type ToastItem } from '@/lib/toast'

export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts)
  return (
    <div className="fixed right-4 bottom-20 z-[60] flex flex-col gap-2 md:bottom-4" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastView key={t.id} toast={t} />
      ))}
    </div>
  )
}

function ToastView({ toast }: { toast: ToastItem }) {
  const [leaving, setLeaving] = useState(false)
  const Icon = toast.icon ?? Check

  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), 3600)
    const remove = window.setTimeout(() => dismissToast(toast.id), 3900)
    return () => {
      window.clearTimeout(leave)
      window.clearTimeout(remove)
    }
  }, [toast.id])

  return (
    <div
      role="status"
      className="toast-in flex max-w-sm items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg transition-[opacity,transform] duration-300"
      style={leaving ? { opacity: 0, transform: 'translateX(12px)' } : undefined}
    >
      <span className="grid size-6 flex-none place-items-center rounded-full bg-success-soft text-success" aria-hidden>
        <Icon className="size-3.5" />
      </span>
      <span className="flex-1">{toast.message}</span>
    </div>
  )
}
