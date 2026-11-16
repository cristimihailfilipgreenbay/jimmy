import type { ReactNode } from 'react'
import { Tip } from '@/components/Tip'

/** Explains a disabled control; while it is enabled the child is left as it is. */
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
  return (
    <Tip text={disabled ? reason : undefined} fill={fill}>
      {children}
    </Tip>
  )
}
