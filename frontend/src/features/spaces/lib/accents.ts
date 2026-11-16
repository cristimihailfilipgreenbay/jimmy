import type { CSSProperties } from 'react'
import type { Accent } from '../schemas/space'

type AccentInfo = {
  value: Accent
  label: string
  /** Solid colour: card bar, swatches. */
  color: string
  /** Pale tint for icon tiles. */
  soft: string
  /** Dark shade for text on the tint. */
  ink: string
}

// The design's ten colours with its exact values. The name is what is stored.
export const ACCENTS: AccentInfo[] = [
  { value: 'leaf-green', label: 'Leaf green', color: 'hsl(152 56% 28%)', soft: 'hsl(146 42% 94%)', ink: 'hsl(152 60% 22%)' },
  { value: 'ink-blue', label: 'Ink blue', color: 'hsl(214 72% 40%)', soft: 'hsl(214 80% 95.5%)', ink: 'hsl(214 75% 32%)' },
  { value: 'copper', label: 'Copper', color: 'hsl(22 82% 36%)', soft: 'hsl(30 85% 94%)', ink: 'hsl(22 85% 28%)' },
  { value: 'rosewood', label: 'Rosewood', color: 'hsl(344 58% 40%)', soft: 'hsl(344 60% 96%)', ink: 'hsl(344 62% 32%)' },
  { value: 'plum', label: 'Plum', color: 'hsl(268 45% 45%)', soft: 'hsl(268 50% 96%)', ink: 'hsl(268 50% 35%)' },
  { value: 'teal', label: 'Teal', color: 'hsl(184 70% 26%)', soft: 'hsl(182 45% 94%)', ink: 'hsl(186 75% 20%)' },
  { value: 'indigo', label: 'Indigo', color: 'hsl(236 48% 46%)', soft: 'hsl(236 60% 96%)', ink: 'hsl(238 50% 36%)' },
  { value: 'ochre', label: 'Ochre', color: 'hsl(38 85% 30%)', soft: 'hsl(42 80% 93%)', ink: 'hsl(34 85% 24%)' },
  { value: 'olive', label: 'Olive', color: 'hsl(78 45% 27%)', soft: 'hsl(75 35% 93%)', ink: 'hsl(80 50% 20%)' },
  { value: 'slate', label: 'Slate', color: 'hsl(215 22% 34%)', soft: 'hsl(215 20% 94%)', ink: 'hsl(215 28% 25%)' },
]

// The design pre-selects Rosewood in the new Study Space dialog.
export const DEFAULT_ACCENT: Accent = 'rosewood'

export const accentInfo = (accent: Accent): AccentInfo => ACCENTS.find((a) => a.value === accent) ?? ACCENTS[ACCENTS.length - 1]

/**
 * CSS variables that tint everything inside an element with this colour, so
 * `bg-space`, `bg-space-soft` and `text-space-ink` pick it up (as the design's
 * `data-space` does).
 */
export const accentStyle = (accent: Accent): CSSProperties =>
  ({
    '--space': accentInfo(accent).color,
    '--space-soft': accentInfo(accent).soft,
    '--space-ink': accentInfo(accent).ink,
  }) as CSSProperties
