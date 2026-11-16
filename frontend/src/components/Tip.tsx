import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * A tooltip around a control. The trigger is a span around it, because a disabled
 * element gets no mouse events. Without `text` the child is left as it is.
 */
export function Tip({
  text,
  fill = false,
  className,
  children,
}: {
  text?: string
  fill?: boolean
  /** For a control that is positioned by its parent: put the position here. */
  className?: string
  children: ReactNode
}) {
  if (!text) return children
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn('inline-flex', fill && 'w-full', className)} />}>{children}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
