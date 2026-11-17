import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// One line of a settings card: a label with its explanation, and the control.
// `info` is a longer explanation, shown in a tooltip beside the label.
export function SettingRow({ id, title, description, info, children }: { id: string; title: string; description: ReactNode; info?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <span id={id}>{title}</span>
          {info && (
            <Tooltip>
              <TooltipTrigger render={<button type="button" aria-label={`About: ${title}`} className="grid size-5 place-items-center rounded-full text-muted-foreground hover:text-foreground" />}>
                <Info className="size-4" aria-hidden />
              </TooltipTrigger>
              <TooltipContent className="max-w-80 px-3 py-2.5 text-[13px] leading-snug">{info}</TooltipContent>
            </Tooltip>
          )}
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
