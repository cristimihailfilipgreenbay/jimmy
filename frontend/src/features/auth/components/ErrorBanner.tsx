import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
      <span>{children}</span>
    </div>
  )
}
