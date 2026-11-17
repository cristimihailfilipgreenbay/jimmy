import { Switch } from '@/components/ui/switch'
import { cardClass } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { useUsage } from '../queries/useDeveloper'
import { formatCost } from '../lib/cost'

// Tokens and estimated cost of the latest answers, with the switch for showing them under each answer.
export function UsageTable({
  studentId,
  showUsage,
  disabled,
  onShowUsage,
}: {
  studentId: string
  showUsage: boolean
  disabled: boolean
  onShowUsage: (show: boolean) => void
}) {
  const { data: usage } = useUsage(studentId)
  const items = usage?.items ?? []
  return (
    <section className={cn(cardClass, 'mt-4')} aria-labelledby="d-usage">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
        <div>
          <h2 id="d-usage" className="font-semibold">
            Tokens and estimated cost per answer
          </h2>
          <p className="text-sm text-muted-foreground">
            Last {items.length} answers · total ≈ {formatCost(usage?.total_usd ?? 0)}
            {usage && usage.answers > items.length && ` over ${usage.answers} answers`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Show under each answer
          <Switch checked={showUsage} disabled={disabled} onCheckedChange={onShowUsage} aria-label="Show usage under each answer" />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Token usage per answer</caption>
          <thead className="border-y border-border bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-2 font-medium">Answer</th>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium">Tools</th>
              <th className="px-3 py-2 text-right font-medium">In</th>
              <th className="px-3 py-2 text-right font-medium">Out</th>
              <th className="px-5 py-2 text-right font-medium">Est. cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((u) => (
              <tr key={u.message_id}>
                <td className="max-w-[220px] truncate px-5 py-2.5">{u.question}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{u.model ?? '—'}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{u.tools.join(', ') || '—'}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{u.tokens_in?.toLocaleString() ?? '—'}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{u.tokens_out?.toLocaleString() ?? '—'}</td>
                <td className="px-5 py-2.5 text-right font-mono tabular-nums">{formatCost(u.cost_usd)}</td>
              </tr>
            ))}
            {usage && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-muted-foreground">
                  No answers yet. Ask Jimmy something and its cost shows here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-xs text-muted-foreground">Costs are estimates from token counts and the model’s list price.</p>
    </section>
  )
}
