import { useParams } from 'react-router'

export function Placeholder({ title, note }: { title: string; note: string }) {
  const { spaceId } = useParams()
  return (
    <section>
      <h2 className="text-2xl font-semibold">{title}</h2>
      {spaceId && <p className="mt-1 text-sm text-muted-foreground">Study Space {spaceId}</p>}
      <p className="mt-4 text-muted-foreground">{note}</p>
    </section>
  )
}
