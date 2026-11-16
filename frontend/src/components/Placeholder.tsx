import type { ReactNode } from 'react'

export function Placeholder({ title, note, children }: { title: string; note: string; children?: ReactNode }) {
  return (
    <section className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-4 text-muted-foreground">{note}</p>
      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}
