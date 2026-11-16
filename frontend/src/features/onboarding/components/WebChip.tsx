import { TriangleAlert } from 'lucide-react'

// How web material is labelled everywhere in Jimmy: dashed amber, with a warning.
export function WebChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border-[1.5px] border-dashed border-[hsl(36_92%_44%)] bg-[hsl(46_100%_92%)] px-1.5 text-[11px] font-medium text-[hsl(30_92%_26%)]">
      <TriangleAlert className="size-3" aria-hidden /> Unreviewed web
    </span>
  )
}
