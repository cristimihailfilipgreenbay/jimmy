import type { ReactNode } from 'react'

export function StepHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  )
}
