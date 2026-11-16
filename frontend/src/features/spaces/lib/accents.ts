import type { Accent } from '../api/spaces'

// Ten colours a Student can pick for a Study Space. The name is what is stored;
// class names are written out in full so Tailwind can see them.
export const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: 'slate', label: 'Slate', swatch: 'bg-slate-700' },
  { value: 'red', label: 'Red', swatch: 'bg-red-700' },
  { value: 'orange', label: 'Orange', swatch: 'bg-orange-700' },
  { value: 'amber', label: 'Amber', swatch: 'bg-amber-600' },
  { value: 'green', label: 'Green', swatch: 'bg-green-700' },
  { value: 'teal', label: 'Teal', swatch: 'bg-teal-700' },
  { value: 'blue', label: 'Blue', swatch: 'bg-blue-700' },
  { value: 'indigo', label: 'Indigo', swatch: 'bg-indigo-700' },
  { value: 'purple', label: 'Purple', swatch: 'bg-purple-700' },
  { value: 'pink', label: 'Pink', swatch: 'bg-pink-700' },
]

export const swatchFor = (accent: Accent) => ACCENTS.find((a) => a.value === accent)?.swatch ?? 'bg-slate-700'
