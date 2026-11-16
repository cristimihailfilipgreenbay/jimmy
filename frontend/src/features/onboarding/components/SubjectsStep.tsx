import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { subjectSuggestions } from '../lib/subjectSuggestions'
import { StepHeading } from './StepHeading'
import { ToggleChip } from './ToggleChip'
import type { StepProps } from './stepProps'

const MAX_SUBJECTS = 20
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function SubjectsStep({ form, update }: StepProps) {
  const [extra, setExtra] = useState('')
  const picked = form.subjects.map((s) => s.name)
  // Suggestions, plus anything the Student added themselves.
  const options = [...new Set([...subjectSuggestions(form.course), ...picked])]

  function toggle(name: string) {
    const exists = form.subjects.some((s) => same(s.name, name))
    if (exists) update({ subjects: form.subjects.filter((s) => !same(s.name, name)) })
    else if (form.subjects.length < MAX_SUBJECTS) update({ subjects: [...form.subjects, { name, course: '', accent: null }] })
  }

  function add(e: FormEvent) {
    e.preventDefault()
    const name = extra.trim()
    if (!name) return
    if (!form.subjects.some((s) => same(s.name, name)) && form.subjects.length < MAX_SUBJECTS) {
      update({ subjects: [...form.subjects, { name, course: '', accent: null }] })
    }
    setExtra('')
  }

  return (
    <div className="flex flex-col gap-4">
      <StepHeading title="Which subjects this term?">Pick a few. You can add more Spaces any time.</StepHeading>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Suggested subjects">
        {options.map((name) => (
          <ToggleChip key={name} withCheck pressed={form.subjects.some((s) => same(s.name, name))} onClick={() => toggle(name)}>
            {name}
          </ToggleChip>
        ))}
      </div>
      <form onSubmit={add} className="flex gap-2">
        <Input aria-label="Add another subject" placeholder="Add another subject…" maxLength={80} value={extra} onChange={(e) => setExtra(e.target.value)} />
        <Button type="submit" variant="outline">
          <Plus /> Add
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground" aria-live="polite">
        {form.subjects.length ? `${form.subjects.length} selected` : 'Nothing selected yet'}
      </p>
    </div>
  )
}
