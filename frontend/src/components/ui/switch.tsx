import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type Props = Omit<ComponentProps<'button'>, 'onChange' | 'role'> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function Switch({ checked, onCheckedChange, className, ...props }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative h-[22px] w-10 flex-none rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
        checked ? 'bg-space' : 'bg-input',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 left-0.5 size-[18px] rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none',
          checked && 'translate-x-[18px]',
        )}
      />
    </button>
  )
}
