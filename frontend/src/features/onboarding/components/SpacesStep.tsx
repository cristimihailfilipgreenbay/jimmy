import { Input } from '@/components/ui/input'
import { AccentSwatches } from '@/features/spaces/components/AccentSwatches'
import { accentInfo } from '@/features/spaces/lib/accents'
import type { Accent } from '@/features/spaces/schemas/space'
import { duplicateNames, withDefaultAccents, type SubjectDraft } from '../lib/form'
import { StepHeading } from './StepHeading'
import type { StepProps } from './stepProps'

export function SpacesStep({ form, update }: StepProps) {
  const subjects = withDefaultAccents(form.subjects)
  const dupes = duplicateNames(subjects)

  const change = (i: number, changes: Partial<SubjectDraft>) =>
    update({ subjects: subjects.map((s, j) => (j === i ? { ...s, ...changes } : s)) })

  return (
    <div className="flex flex-col gap-4">
      <StepHeading title="Your Study Spaces">Each one keeps its own notes, chat, quizzes and flashcards.</StepHeading>
      <ul className="flex flex-col gap-3">
        {subjects.map((s, i) => {
          const accent = accentInfo(s.accent as Accent)
          return (
            <li key={i} className="rounded-xl border bg-card p-4">
              <div className="flex gap-3">
                <span className="w-1.5 flex-none self-stretch rounded-full transition-colors duration-300" style={{ backgroundColor: accent.color }} aria-hidden />
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <label htmlFor={`space-name-${i}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                      Space name
                    </label>
                    <Input
                      id={`space-name-${i}`}
                      value={s.name}
                      maxLength={80}
                      onChange={(e) => change(i, { name: e.target.value })}
                      aria-invalid={dupes.has(i) || !s.name.trim() ? true : undefined}
                      className="h-10 text-[15px] font-medium"
                    />
                    {dupes.has(i) && <p className="mt-1 text-xs text-destructive">Each Study Space needs its own name.</p>}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`space-code-${i}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                        Course code <span className="font-normal">(optional)</span>
                      </label>
                      <Input
                        id={`space-code-${i}`}
                        placeholder="e.g. BIO 204"
                        maxLength={60}
                        value={s.course}
                        onChange={(e) => change(i, { course: e.target.value })}
                        className="h-10 text-[15px]"
                      />
                    </div>
                    <div>
                      <label htmlFor={`space-lecturer-${i}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                        Lecturer <span className="font-normal">(optional)</span>
                      </label>
                      <Input
                        id={`space-lecturer-${i}`}
                        autoComplete="off"
                        placeholder="e.g. Prof. Weber"
                        maxLength={60}
                        value={s.lecturer}
                        onChange={(e) => change(i, { lecturer: e.target.value })}
                        className="h-10 text-[15px]"
                      />
                    </div>
                  </div>
                  <div>
                    <p id={`space-colour-${i}`} className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Colour · <span className="text-foreground">{accent.label}</span>
                    </p>
                    <AccentSwatches value={s.accent as Accent} onChange={(next) => change(i, { accent: next })} labelledBy={`space-colour-${i}`} />
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
