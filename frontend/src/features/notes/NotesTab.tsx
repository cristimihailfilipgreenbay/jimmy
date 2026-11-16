import { useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TopicReviewDialog } from '@/features/topics/components/TopicReviewDialog'
import { errorMessage } from '@/lib/http'
import { cardClass } from '@/lib/styles'
import { DeleteNoteDialog } from './components/DeleteNoteDialog'
import { DropZone } from './components/DropZone'
import { NoteRow } from './components/NoteRow'
import { useDocuments } from './queries/useDocuments'
import { useUploadDocument } from './queries/useUploadDocument'
import type { Space } from '@/features/spaces/schemas/space'
import type { Document } from './schemas/document'

type Rejected = { key: number; name: string; message: string }

// The Notes tab of a Study Space: upload, the list with where each file has got to,
// and the Topic review that every upload pauses for.
export function NotesTab({ studentId, space }: { studentId: string; space: Space }) {
  const spaceId = space.id
  const { data: notes = [], isPending } = useDocuments(studentId, spaceId)
  const upload = useUploadDocument(studentId, spaceId)
  const [uploading, setUploading] = useState<{ key: number; name: string }[]>([])
  const [rejected, setRejected] = useState<Rejected[]>([])
  const [picked, setPicked] = useState<Document | null>(null)
  const [deleting, setDeleting] = useState<Document | null>(null)
  const nextKey = useRef(1)
  // Files uploaded in this visit open their Topic review by themselves, once.
  const [mine, setMine] = useState<string[]>([])
  const [closed, setClosed] = useState<string[]>([])

  async function add(files: File[]) {
    for (const file of files) {
      const key = nextKey.current++
      setUploading((u) => [...u, { key, name: file.name }])
      try {
        const added = await upload.mutateAsync(file)
        setMine((ids) => [...ids, added.id])
      } catch (err) {
        const message = errorMessage(err, 'The upload failed.')
        setRejected((r) => [...r, { key: nextKey.current++, name: file.name, message }])
      } finally {
        setUploading((u) => u.filter((x) => x.key !== key))
      }
    }
  }

  const reviewing =
    picked ?? notes.find((n) => n.status === 'awaiting_topic_review' && mine.includes(n.id) && !closed.includes(n.id)) ?? null
  const closeReview = () => {
    if (reviewing) setClosed((ids) => [...ids, reviewing.id])
    setPicked(null)
  }

  if (isPending) return null

  if (!notes.length && !uploading.length && !rejected.length) {
    return (
      <div className="mx-auto max-w-xl">
        <DropZone big onFiles={add} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Jimmy reads your files, pulls out topics for you to check, and then answers questions from them, with page
          numbers.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className={cardClass}>
        <ul className="divide-y" role="list">
          {uploading.map(({ key, name }) => (
            <li key={key} className="flex items-center gap-3 p-3">
              <span className="grid size-9 place-items-center rounded-md bg-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name}</p>
                <div className="skel mt-1.5 h-1.5 w-full max-w-xs rounded-full" role="progressbar" aria-label="Uploading" />
                <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>
              </div>
            </li>
          ))}
          {rejected.map((r) => (
            <li key={r.key} role="alert" className="flex items-start gap-3 bg-destructive-soft/60 p-3">
              <span className="grid size-9 flex-none place-items-center rounded-md bg-destructive-soft text-destructive" aria-hidden>
                <AlertTriangle className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {r.name} <span className="ml-1 text-xs font-semibold text-destructive">Upload rejected</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.message}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setRejected((all) => all.filter((x) => x.key !== r.key))}>
                Dismiss
              </Button>
            </li>
          ))}
          {notes.map((note) => (
            <NoteRow key={note.id} note={note} onReview={() => setPicked(note)} onDelete={() => setDeleting(note)} />
          ))}
        </ul>
      </div>
      <div className="space-y-4">
        <DropZone big={false} onFiles={add} />
        <div className={`${cardClass} p-4 text-sm`}>
          <p className="font-medium">How Jimmy uses these</p>
          <p className="mt-1 text-muted-foreground">
            Every answer that comes from a file cites it by document and page. Deleting a file keeps flashcards but marks
            old citations as unavailable.
          </p>
        </div>
      </div>
      <TopicReviewDialog studentId={studentId} spaceId={spaceId} accent={space.accent} note={reviewing} onClose={closeReview} />
      <DeleteNoteDialog studentId={studentId} spaceId={spaceId} note={deleting} onClose={() => setDeleting(null)} />
    </div>
  )
}
