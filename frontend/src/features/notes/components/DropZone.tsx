import { useId, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

// The design's upload area: large when the Space has no Notes yet, compact beside the list.
export function DropZone({ big, onFiles }: { big: boolean; onFiles: (files: File[]) => void }) {
  const id = useId()
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    onFiles([...(e.target.files ?? [])])
    e.target.value = ''
  }
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onFiles([...e.dataTransfer.files])
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-card text-center transition-colors duration-200 hover:border-space hover:bg-space-soft/40',
        big ? 'py-16' : 'py-8',
      )}
    >
      <span className="grid size-10 place-items-center rounded-full bg-space-soft text-space-ink">
        <Upload className="size-5" aria-hidden />
      </span>
      <span className="text-sm font-medium">{big ? 'Add your first notes' : 'Drop files here or browse'}</span>
      <span className="text-xs text-muted-foreground">PDF, Markdown or plain text · up to 20 MB each</span>
      <input id={id} type="file" className="sr-only" multiple accept=".pdf,.md,.markdown,.txt" onChange={pick} />
    </label>
  )
}
