import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/http'
import { cn } from '@/lib/utils'
import type { Accent } from '../api/spaces'
import { useCreateSpace } from '../hooks/useCreateSpace'
import { ACCENTS } from '../lib/accents'

export function CreateSpaceDialog({ studentId, open, onClose }: { studentId: string; open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [accent, setAccent] = useState<Accent>('slate')
  const create = useCreateSpace(studentId)
  const error = create.error ? errorMessage(create.error, 'Could not create the Study Space.') : null

  function close() {
    create.reset()
    onClose()
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate(
      { name, accent },
      {
        onSuccess: () => {
          setName('')
          setAccent('slate')
          close()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New Study Space</DialogTitle>
            <DialogDescription>One Study Space per subject keeps your Notes and answers separate.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="Study Space name"
            placeholder="e.g. Biology"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-2 text-sm text-muted-foreground">Accent colour</legend>
            {ACCENTS.map((a) => (
              <label
                key={a.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1 text-sm',
                  accent === a.value && 'border-foreground font-medium',
                )}
              >
                <input
                  type="radio"
                  name="accent"
                  className="sr-only"
                  checked={accent === a.value}
                  onChange={() => setAccent(a.value)}
                />
                <span className={cn('size-3 rounded-full', a.swatch)} aria-hidden />
                {a.label}
              </label>
            ))}
          </fieldset>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
