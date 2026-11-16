import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Explains a disabled control. A disabled element gets no mouse events, so the
 * tooltip hangs off a span around it. Without a reason, or while enabled, the child
 * is left as it is.
 */
export function WhenDisabled({
  disabled,
  reason,
  fill = false,
  children,
}: {
  disabled?: boolean
  reason?: string
  /** The control is full width, so the wrapper must be too. */
  fill?: boolean
  children: ReactNode
}) {
  if (!disabled || !reason) return children
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn('inline-flex', fill && 'w-full')} />}>{children}</TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}
