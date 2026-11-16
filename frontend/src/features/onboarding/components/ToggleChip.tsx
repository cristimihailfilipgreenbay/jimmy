import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ToggleChip({
  pressed,
  onClick,
  children,
  withCheck = false,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
  withCheck?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors duration-200',
        pressed ? 'border-primary bg-primary/10 text-foreground' : 'bg-card hover:bg-muted',
      )}
    >
      {withCheck && (
        <span
          className={cn(
            'grid h-4 place-items-center overflow-hidden transition-all duration-200 motion-reduce:transition-none',
            pressed ? 'w-4 opacity-100' : 'w-0 opacity-0',
          )}
          aria-hidden
        >
          <Check className="size-3.5" />
        </span>
      )}
      {children}
    </button>
  )
}
