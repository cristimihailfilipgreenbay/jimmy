import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { messageInSchema } from '../schemas/chat'

const SUGGESTIONS = ['What can you help with before I add notes?']

const BUSY_REASON = 'Jimmy is answering. Stop the answer to ask something else.'

export function Composer({ spaceName, busy, onSend, onStop }: { spaceName: string; busy: boolean; onSend: (q: string) => void; onStop: () => void }) {
  const [value, setValue] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)

  function submit(e?: FormEvent) {
    e?.preventDefault()
    const parsed = messageInSchema.safeParse(value)
    if (!parsed.success || busy) return
    onSend(parsed.data)
    setValue('')
    if (field.current) field.current.style.height = ''
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="sticky bottom-16 z-10 bg-background pt-2 pb-2 md:bottom-0">
      <div className="scroll-thin -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            title={busy ? BUSY_REASON : undefined}
            onClick={() => onSend(s)}
            className="flex-none rounded-full border border-border bg-card px-3 py-1 text-xs enabled:hover:bg-muted disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 rounded-lg border border-border bg-card p-2 shadow-[0_1px_2px_rgba(20,20,30,.04)] focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring">
        <label htmlFor="ask-in" className="sr-only">
          Ask Jimmy about {spaceName}
        </label>
        <textarea
          ref={field}
          id="ask-in"
          rows={1}
          value={value}
          disabled={busy}
          title={busy ? BUSY_REASON : undefined}
          placeholder={`Ask about ${spaceName}…`}
          onChange={(e) => {
            setValue(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
          }}
          onKeyDown={onKeyDown}
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none disabled:opacity-60"
        />
        {busy ? (
          <Button type="button" variant="outline" size="icon" onClick={onStop} aria-label="Stop generating">
            <Square />
          </Button>
        ) : (
          <Button type="submit" variant="space" size="icon" aria-label="Send">
            <Send />
          </Button>
        )}
      </form>
      <p className="mt-1.5 hidden text-center text-[11px] text-muted-foreground md:block">
        Enter to send · Shift+Enter for a new line · every statement shows its source
      </p>
    </div>
  )
}
