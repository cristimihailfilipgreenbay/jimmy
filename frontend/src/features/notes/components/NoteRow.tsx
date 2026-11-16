import { AlertTriangle, Check, FileText, Loader2, Tag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addedLabel, kindLabel } from '../lib/added'
import type { Document } from '../schemas/document'

const STATUS_TEXT: Record<string, string> = {
  uploaded: 'Reading pages and extracting topics…',
  extracting: 'Reading pages and extracting topics…',
  embedding: 'Indexing your notes…',
}

const badge = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium'

// One Notes document, in whichever state the server has got to with it.
export function NoteRow({
  note,
  onReview,
  onDelete,
}: {
  note: Document
  onReview: () => void
  onDelete: () => void
}) {
  const remove = (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-destructive"
      onClick={onDelete}
      aria-label={`Delete ${note.title}`}
    >
      <Trash2 />
    </Button>
  )

  if (note.status === 'failed' || note.status === 'rejected') {
    return (
      <li role="alert" className="flex items-start gap-3 bg-destructive-soft/60 p-3">
        <span className="grid size-9 flex-none place-items-center rounded-md bg-destructive-soft text-destructive" aria-hidden>
          <AlertTriangle className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {note.title} <span className="ml-1 text-xs font-semibold text-destructive">Could not be indexed</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{note.rejection_reason ?? 'Something went wrong.'}</p>
        </div>
        {remove}
      </li>
    )
  }

  const working = STATUS_TEXT[note.status]
  const pages = note.page_count === null ? null : `${note.page_count} ${note.page_count === 1 ? 'page' : 'pages'}`
  return (
    <li className="flex items-center gap-3 p-3">
      <span className="grid size-9 flex-none place-items-center rounded-md bg-notes-soft text-notes" aria-hidden>
        {working ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{note.title}</p>
        <p className="text-xs text-muted-foreground">
          {working ?? [note.author, pages, kindLabel(note.mime_type), `added ${addedLabel(note.created_at)}`].filter(Boolean).join(' · ')}
        </p>
      </div>
      {note.status === 'awaiting_topic_review' && (
        <Button variant="space" size="sm" onClick={onReview}>
          <Tag /> Review topics
        </Button>
      )}
      {note.status === 'ready' && (
        <span className={`${badge} hidden bg-success-soft text-success sm:inline-flex`}>
          <Check className="size-3" aria-hidden /> Ready
        </span>
      )}
      {remove}
    </li>
  )
}
