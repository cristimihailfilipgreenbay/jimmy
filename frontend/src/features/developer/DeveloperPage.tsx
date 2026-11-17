import { useState } from 'react'
import { ChevronLeft, Code, Info, Lock, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { UsageTable } from './components/UsageTable'
import { useDeveloperSettings, useModels, useUpdateSettings } from './queries/useDeveloper'
import { MAX_TOKENS_RANGE, maxTokensSchema } from './schemas/developer'

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
  // The models Jimmy offers, plus the one in use if the environment set another.
  const current = settings?.tutor_model ?? ''
  const offered = models.data ?? []
  const known = offered.some((m) => m.id === current)
  const nameOf = (id: string) => offered.find((m) => m.id === id)?.name ?? id
  // Only known to be false once the model list has answered.
  const ignoresTemperature = offered.find((m) => m.id === current)?.supports_temperature === false

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
          <label className="mt-4 mb-1.5 block text-sm font-medium" id="d-tutor-label">
            Model
          </label>
          <Select value={current} onValueChange={(tutor_model) => tutor_model && update.mutate({ tutor_model })} disabled={!settings || models.isPending}>
            <SelectTrigger className="w-full" aria-labelledby="d-tutor-label">
              <SelectValue>{(id: string) => nameOf(id)}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="min-w-72">
              {!known && current && <SelectItem value={current}>{current}</SelectItem>}
              {offered.map((m) => (
                <SelectItem key={m.id} value={m.id} className="items-start py-1.5">
                  <span className="flex flex-col">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-4 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <label htmlFor="d-temp" className="text-sm font-medium">
                Temperature
              </label>
              <Tooltip>
                <TooltipTrigger render={<button type="button" aria-label="About temperature" className="grid size-5 place-items-center rounded-full text-muted-foreground hover:text-foreground" />}>
                  <Info className="size-4" aria-hidden />
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  Some models, such as GPT and Claude, ignore temperature, so changing it does nothing for them. Jimmy then does not send it. The slider is switched off for those, and works for models that take one, such as Gemini.
                </TooltipContent>
              </Tooltip>
            </span>
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
            disabled={!settings || ignoresTemperature}
            className="mt-2 w-full accent-space disabled:opacity-50"
            aria-describedby="d-temp-hint"
            onChange={(e) => setTemperature(Number(e.target.value))}
            onPointerUp={saveTemperature}
            onKeyUp={saveTemperature}
            onBlur={saveTemperature}
          />
          <p id="d-temp-hint" className="mt-1 text-xs text-muted-foreground">
            {ignoresTemperature ? `${nameOf(current)} ignores temperature, so this has no effect.` : 'Lower is more consistent. 0.2–0.4 suits tutoring.'}
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
