import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useDecideFact, useFacts } from '../queries/useFacts'
import { useProfile, useUpdateProfile } from '../queries/useProfile'
import { EXPLANATION_STYLES } from '../schemas/settings'

// How Jimmy writes answers in every Study Space: language, length, and the style changes
// the Student approved after rating answers down.
export function AnswerStyleSection({ studentId }: { studentId: string }) {
  const { data: profile } = useProfile(studentId)
  const update = useUpdateProfile(studentId)
  const { data: facts = [] } = useFacts(studentId)
  const decide = useDecideFact(studentId)
  // What is typed until the field is left; then the saved value shows again.
  const [draft, setDraft] = useState<string | null>(null)
  const language = draft ?? profile?.language ?? ''
  const approved = facts.filter((f) => f.kind === 'style' && f.origin === 'feedback' && f.status === 'approved')
  const hint = EXPLANATION_STYLES.find((s) => s.value === profile?.explanation_style)?.hint
  return (
    <section className={cn(cardClass, 'mt-4 p-5')} aria-labelledby="s-answers">
      <h2 id="s-answers" className="font-semibold">
        Answers
      </h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="answer-language">
            Language <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="answer-language"
            className="h-10 text-[15px]"
            value={language}
            maxLength={40}
            disabled={!profile}
            placeholder="e.g. German. Empty answers in the language you write in."
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft !== null && draft.trim() !== (profile?.language ?? '')) update.mutate({ language: draft.trim() })
              setDraft(null)
            }}
          />
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Answer length</legend>
          <SegmentedControl
            label="Answer length"
            options={EXPLANATION_STYLES}
            value={profile?.explanation_style ?? null}
            onChange={(explanation_style) => update.mutate({ explanation_style })}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
        </fieldset>
        {approved.length > 0 && (
          <div>
            <p className="text-sm font-medium" id="approved-styles">
              Styles you approved
            </p>
            <ul aria-labelledby="approved-styles" className="mt-1.5 divide-y divide-border rounded-lg border border-border">
              {approved.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  {f.text}
                  <Button variant="ghost" size="icon-sm" aria-label={`Forget: ${f.text}`} disabled={decide.isPending} onClick={() => decide.mutate({ id: f.id, approve: false })}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Applies in every Study Space. Changes save automatically.</p>
      </div>
    </section>
  )
}
