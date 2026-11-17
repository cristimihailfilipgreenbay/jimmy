import { useState } from 'react'
import { ChevronLeft, Code, Lock, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { UsageTable } from './components/UsageTable'
import { useDeveloperSettings, useModels, useUpdateSettings } from './queries/useDeveloper'
import { MAX_TOKENS_RANGE, maxTokensSchema } from './schemas/developer'

const selectClass = 'h-9 w-full rounded-md border border-input bg-card px-3 text-sm transition-colors duration-200 focus:border-space disabled:opacity-50'

// Model, temperature, tools and cost. Kept apart from the Student's screens on purpose.
export function DeveloperPage() {
  const student = useSignedInStudent()
  const { data: settings } = useDeveloperSettings(student.id)
  const models = useModels()
  const update = useUpdateSettings(student.id)
  // What is typed or dragged until it is let go; then the saved value shows again.
  const [temperature, setTemperature] = useState<number | null>(null)
  const [maxTokens, setMaxTokens] = useState<string | null>(null)
  const [maxTokensInvalid, setMaxTokensInvalid] = useState(false)

  const shownTemperature = temperature ?? settings?.temperature ?? 0
  const saveTemperature = () => {
    if (temperature !== null && temperature !== settings?.temperature) update.mutate({ temperature })
    setTemperature(null)
  }
  const saveMaxTokens = () => {
    if (maxTokens === null) return
    const parsed = maxTokensSchema.safeParse(Number(maxTokens))
    if (!parsed.success) return setMaxTokensInvalid(true)
    setMaxTokensInvalid(false)
    if (parsed.data !== settings?.max_tokens) update.mutate({ max_tokens: parsed.data })
    setMaxTokens(null)
  }
  // The pickers list what OpenRouter offers, plus the model in use if it is not listed.
  const options = (current: string) => {
    const ids = models.data?.map((m) => m.id) ?? []
    return current && !ids.includes(current) ? [current, ...ids] : ids
  }
  const modelPicker = (id: string, label: string, value: string, key: 'tutor_model' | 'background_model') => (
    <>
      <label className="mt-4 mb-1.5 block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <select id={id} className={selectClass} value={value} disabled={!settings || models.isPending} onChange={(e) => update.mutate({ [key]: e.target.value })}>
        {!value && <option value="">Not set</option>}
        {options(value).map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </>
  )

  return (
    <main id="main" className="mx-auto max-w-4xl px-4 py-8 pb-28">
      <div className="flex items-center gap-2">
        <Link to="/settings" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-2')}>
          <ChevronLeft /> Settings
        </Link>
      </div>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Code className="size-6" aria-hidden /> Developer
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">For testing and tuning. Students never need to open this page.</p>
      {(update.isError || models.isError) && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
          {update.isError ? 'Jimmy could not save that. Try again.' : 'The model list is not available right now.'}
        </p>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className={cn(cardClass, 'p-5')} aria-labelledby="d-model">
          <h2 id="d-model" className="font-semibold">
            Model
          </h2>
          {modelPicker('d-tutor', 'Tutor model', settings?.tutor_model ?? '', 'tutor_model')}
          {modelPicker('d-background', 'Background model', settings?.background_model ?? '', 'background_model')}
          <div className="mt-4 flex items-center justify-between">
            <label htmlFor="d-temp" className="text-sm font-medium">
              Temperature
            </label>
            <output htmlFor="d-temp" className="font-mono text-sm">
              {shownTemperature.toFixed(2)}
            </output>
          </div>
          <input
            id="d-temp"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={shownTemperature}
            disabled={!settings}
            className="mt-2 w-full accent-space"
            aria-describedby="d-temp-hint"
            onChange={(e) => setTemperature(Number(e.target.value))}
            onPointerUp={saveTemperature}
            onKeyUp={saveTemperature}
            onBlur={saveTemperature}
          />
          <p id="d-temp-hint" className="mt-1 text-xs text-muted-foreground">
            Lower is more consistent. 0.2–0.4 suits tutoring.
          </p>
          <label className="mt-4 mb-1.5 block text-sm font-medium" htmlFor="d-max">
            Max tokens per answer
          </label>
          <Input
            id="d-max"
            type="number"
            className="font-mono"
            {...MAX_TOKENS_RANGE}
            value={maxTokens ?? settings?.max_tokens ?? ''}
            disabled={!settings}
            aria-invalid={maxTokensInvalid}
            onChange={(e) => setMaxTokens(e.target.value)}
            onBlur={saveMaxTokens}
            onKeyDown={(e) => e.key === 'Enter' && saveMaxTokens()}
          />
          {maxTokensInvalid && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              Use a whole number from {MAX_TOKENS_RANGE.min} to {MAX_TOKENS_RANGE.max}.
            </p>
          )}
          {settings && (
            <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Lock className="mt-0.5 size-3.5 flex-none" aria-hidden />
              <span>
                Embedding model <span className="font-mono">{settings.embedding_model}</span> ({settings.embedding_dimensions} dimensions).{' '}
                {settings.embedding_locked ? 'Locked: Notes already use it, and changing it would mean embedding them again.' : 'Set in the environment. It locks once you add Notes.'}
              </span>
            </p>
          )}
        </section>
        <section className={cn(cardClass, 'px-5 pb-2')} aria-labelledby="d-tools">
          <h2 id="d-tools" className="pt-5 font-semibold">
            Tools
          </h2>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-mono text-sm">search_notes</p>
                <p className="text-xs text-muted-foreground">Search Notes · Always on: every answer starts with the Notes</p>
              </div>
              <Switch checked disabled onCheckedChange={() => {}} aria-label="Tool Search Notes, always on" />
            </div>
            {settings?.tools.map((t) => (
              <div key={t.name} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-mono text-sm" id={`tool-${t.name}`}>
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.label} · {t.description}
                  </p>
                </div>
                <Switch checked={t.enabled} onCheckedChange={(enabled) => update.mutate({ tools: { [t.name]: enabled } })} aria-labelledby={`tool-${t.name}`} />
              </div>
            ))}
          </div>
        </section>
      </div>
      <UsageTable studentId={student.id} showUsage={settings?.show_usage ?? true} disabled={!settings} onShowUsage={(show_usage) => update.mutate({ show_usage })} />
    </main>
  )
}
