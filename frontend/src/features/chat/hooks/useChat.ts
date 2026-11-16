import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/lib/http'
import type { ToolPill } from '../components/AnswerMessage'
import { useSendMessage } from '../queries/useSendMessage'
import { messagesKey, threadsKey, useCreateThread, useMessages, useThreads } from '../queries/useThreads'
import type { Citation, StreamEvent } from '../schemas/chat'

export type Step = { tool: string; state: 'run' | 'done'; found?: number }
export type Pending = { question: string; text: string; citations: Citation[]; steps: Step[] }

const TOOL_NAMES: Record<string, { run: string; done: string }> = {
  search_notes: { run: 'Searching your notes…', done: 'Searched your notes' },
  search_library: { run: 'Searching Subject Library…', done: 'Searched Subject Library' },
  search_wikipedia: { run: 'Searching Wikipedia…', done: 'Searched Wikipedia' },
  search_web: { run: 'Searching the web…', done: 'Searched the web' },
}
export const stepLabel = (s: Step) => (TOOL_NAMES[s.tool] ?? { run: s.tool, done: s.tool })[s.state === 'run' ? 'run' : 'done']
export const stepMeta = (s: Step) =>
  s.state === 'done' && s.found !== undefined ? (s.found === 0 ? 'no match' : `${s.found} passage${s.found === 1 ? '' : 's'}`) : undefined

/** One Study Space's conversation: its stored messages plus the answer being streamed. */
export function useChat(studentId: string, spaceId: string) {
  const qc = useQueryClient()
  const { data: threads } = useThreads(studentId, spaceId)
  const createThread = useCreateThread(studentId, spaceId)
  const send = useSendMessage()
  const [chosenThread, setChosenThread] = useState<string>()
  const threadId = chosenThread ?? threads?.[0]?.id
  const { data: messages = [], isPending: loadingMessages } = useMessages(threadId)
  const [pending, setPending] = useState<Pending | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pills, setPills] = useState<Record<string, ToolPill[]>>({})
  const abort = useRef<AbortController | null>(null)

  async function ask(question: string) {
    if (pending) return
    setError(null)
    const run: Pending = { question, text: '', citations: [], steps: [] }
    // `run` is mutated by the events; React gets a fresh copy each time.
    const publish = () => setPending({ ...run, steps: run.steps.map((s) => ({ ...s })), citations: [...run.citations] })
    const apply = (e: StreamEvent) => {
      if (e.type === 'token') run.text += e.text
      else if (e.type === 'reset') run.text = ''
      else if (e.type === 'tool_call' && e.status === 'started') run.steps.push({ tool: e.tool, state: 'run' })
      else if (e.type === 'tool_call') {
        const step = run.steps.findLast((s) => s.tool === e.tool && s.state === 'run')
        if (step) Object.assign(step, { state: 'done', found: e.found })
      } else if (e.type === 'citation') run.citations.push(e)
      else if (e.type === 'error') setError(e.message)
      else if (e.type === 'done') {
        run.text = e.content
        setPills((p) => ({ ...p, [e.message_id]: run.steps.map((s) => ({ label: stepLabel(s), meta: stepMeta(s) })) }))
      }
      publish()
    }
    publish()
    abort.current = new AbortController()
    try {
      const id = threadId ?? (await createThread.mutateAsync()).id
      setChosenThread(id)
      await send.mutateAsync({ threadId: id, content: question, onEvent: apply, signal: abort.current.signal })
      await qc.invalidateQueries({ queryKey: messagesKey(id) })
      await qc.invalidateQueries({ queryKey: threadsKey(studentId, spaceId) })
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) setError(errorMessage(err, 'Jimmy could not answer. Try again.'))
      if (threadId) await qc.invalidateQueries({ queryKey: messagesKey(threadId) })
    } finally {
      setPending(null)
      abort.current = null
    }
  }

  return { messages, loadingMessages: !!threadId && loadingMessages, pending, error, pills, ask, stop: () => abort.current?.abort() }
}
