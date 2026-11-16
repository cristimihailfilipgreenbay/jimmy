import type { Accent } from '@/lib/api'

// Fixed per-Space accent colours from the design prototype.
export const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: 'default', label: 'Slate', swatch: 'bg-slate-700' },
  { value: 'biology', label: 'Green', swatch: 'bg-emerald-700' },
  { value: 'physics', label: 'Blue', swatch: 'bg-blue-700' },
  { value: 'chemistry', label: 'Orange', swatch: 'bg-orange-700' },
  { value: 'history', label: 'Rose', swatch: 'bg-rose-700' },
  { value: 'math', label: 'Purple', swatch: 'bg-purple-700' },
]

export const swatchFor = (accent: Accent) => ACCENTS.find((a) => a.value === accent)?.swatch ?? 'bg-slate-700'
