import type { ReactNode } from 'react'

// One line of a settings card: a label with its explanation, and the control.
export function SettingRow({ id, title, description, children }: { id: string; title: string; description: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div>
        <p className="text-sm font-medium" id={id}>
          {title}
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}
