import { cn } from '@/lib/utils'

type Option<T extends string> = { value: T; label: string }

/**
 * A row of options with a pill that slides to the selected one, as in the design.
 * `value` may be null (nothing chosen yet), which hides the pill.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option<T>[]
  value: T | null
  onChange: (value: T) => void
}) {
  const index = options.findIndex((o) => o.value === value)
  const n = options.length
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative grid rounded-lg bg-muted p-1"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-md bg-card shadow-sm transition-[translate,opacity] duration-[280ms] ease-[cubic-bezier(.3,.7,.2,1)] motion-reduce:transition-none"
        style={{ width: `calc((100% - 0.5rem) / ${n})`, translate: `${Math.max(index, 0) * 100}% 0`, opacity: index < 0 ? 0 : 1 }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative z-10 rounded-md py-1.5 text-sm font-medium transition-colors duration-200',
            o.value === value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
