import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACCENTS, accentStyle } from '../lib/accents'
import type { Accent } from '../schemas/space'

/** The ten colours as round swatches; the chosen one has a ring and a tick. */
export function AccentSwatches({
  value,
  onChange,
  labelledBy,
}: {
  value: Accent
  onChange: (accent: Accent) => void
  labelledBy: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={labelledBy}>
      {ACCENTS.map((a) => {
        const on = a.value === value
        return (
          <button
            key={a.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={a.label}
            title={a.label}
            onClick={() => onChange(a.value)}
            style={accentStyle(a.value)}
            className={cn(
              'grid size-7 place-items-center rounded-full bg-space text-white ring-offset-2 ring-offset-card transition duration-200 hover:scale-110',
              on && 'ring-2 ring-space',
            )}
          >
            {on && <Check className="size-3.5" />}
          </button>
        )
      })}
    </div>
  )
}
