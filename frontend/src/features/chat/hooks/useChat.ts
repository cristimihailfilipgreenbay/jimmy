import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/lib/http'
import type { ToolPill } from '../components/AnswerMessage'
import type { ConflictCardState } from '../components/ConflictCard'
import { useResumeThread } from '../queries/useResumeThread'
import { useSendMessage } from '../queries/useSendMessage'
import { messagesKey, threadsKey, useCreateThread, useMessages } from '../queries/useThreads'
import type { Citation, ConflictDecision, StreamEvent } from '../schemas/chat'

export type Step = { tool: string; state: 'run' | 'done'; found?: number }
export type Pending = { question: string; text: string; citations: Citation[]; steps: Step[]; conflicts: ConflictCardState[] }

const TOOL_NAMES: Record<string, { run: string; done: string }> = {
  search_notes: { run: 'Searching your notes…', done: 'Searched your notes' },
  search_library: { run: 'Searching Subject Library…', done: 'Searched Subject Library' },
  search_learned_material: { run: 'Searching Learned Material…', done: 'Searched Learned Material' },
  search_wikipedia: { run: 'Searching Wikipedia…', done: 'Searched Wikipedia' },
  search_web: { run: 'Searching the web…', done: 'Searched the web' },
  compare_sources: { run: 'Comparing sources…', done: 'Compared sources' },
}
export const stepLabel = (s: Step) => (TOOL_NAMES[s.tool] ?? { run: s.tool, done: s.tool })[s.state === 'run' ? 'run' : 'done']
export const stepMeta = (s: Step) =>
  s.state === 'done' && s.found !== undefined ? (s.found === 0 ? 'no match' : `${s.found} passage${s.found === 1 ? '' : 's'}`) : undefined

/** What to say beside Jimmy's avatar while a run is going: the tool at work, else thinking or writing. */
export function chatStatus(run: Pending): { label: string; working: boolean } {
  if (run.conflicts.some((c) => !c.decision)) return { label: 'Waiting for your decision', working: false }
  const step = run.steps.findLast((s) => s.state === 'run')
  if (step) return { label: stepLabel(step), working: true }
  return { label: run.text ? 'Writing…' : 'Thinking…', working: true }
}

/** One Study Space's conversation: its stored messages plus the answer being streamed. */
export function useChat(studentId: string, spaceId: string, threadId: string | undefined, onThread: (id: string) => void) {
  const qc = useQueryClient()
  const createThread = useCreateThread(studentId, spaceId)
  const send = useSendMessage()
  const resume = useResumeThread()
  const stored = useMessages(threadId)
  const messages = stored.data?.messages ?? []
  const loadingMessages = stored.isPending
  const [pending, setPending] = useState<Pending | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pills, setPills] = useState<Record<string, ToolPill[]>>({})
  // The Conflicts a finished answer paused for, kept beside it as "Resolved" lines.
  const [conflicts, setConflicts] = useState<Record<string, ConflictCardState[]>>({})
  const abort = useRef<AbortController | null>(null)
  // The run being streamed. It outlives one request: a pause ends the stream, and the
  // answer to it continues the same run.
  const run = useRef<Pending | null>(null)

  // `run` is mutated by the events; React gets a fresh copy each time.
  const publish = () => {
    const r = run.current
    setPending(r && { ...r, steps: r.steps.map((s) => ({ ...s })), citations: [...r.citations], conflicts: r.conflicts.map((c) => ({ ...c })) })
  }

  const apply = (e: StreamEvent) => {
    const r = run.current
    if (!r) return
    if (e.type === 'token') r.text += e.text
    else if (e.type === 'reset') r.text = ''
    else if (e.type === 'tool_call' && e.status === 'started') r.steps.push({ tool: e.tool, state: 'run' })
    else if (e.type === 'tool_call') {
      const step = r.steps.findLast((s) => s.tool === e.tool && s.state === 'run')
      if (step) Object.assign(step, { state: 'done', found: e.found })
    } else if (e.type === 'citation') r.citations.push(e)
    else if (e.type === 'interrupt') {
      r.steps.forEach((s) => Object.assign(s, { state: 'done' }))
      r.conflicts.push({ interruptId: e.interrupt_id, payload: e.payload })
    } else if (e.type === 'error') setError(e.message)
    else if (e.type === 'done') {
      r.text = e.content
      setPills((p) => ({ ...p, [e.message_id]: r.steps.map((s) => ({ label: stepLabel(s), meta: stepMeta(s) })) }))
      if (r.conflicts.length > 0) setConflicts((c) => ({ ...c, [e.message_id]: r.conflicts.map((x) => ({ ...x })) }))
    }
    publish()
  }

  // Streams one request into the run. A run that ends on a pause stays on screen.
  // `threadOf` is read when the run ends: a first question creates its thread while it runs.
  async function drive(threadOf: () => string | undefined, go: (signal: AbortSignal) => Promise<void>) {
    abort.current = new AbortController()
    let failed = false
    try {
      await go(abort.current.signal)
    } catch (err) {
      failed = true
      if (!(err instanceof DOMException && err.name === 'AbortError')) setError(errorMessage(err, 'Jimmy could not answer. Try again.'))
    } finally {
      abort.current = null
    }
    if (!failed && run.current?.conflicts.some((c) => !c.decision)) return
    const id = threadOf()
    if (id) {
      await qc.invalidateQueries({ queryKey: messagesKey(id) })
      await qc.invalidateQueries({ queryKey: threadsKey(studentId, spaceId) })
    }
    run.current = null
    setPending(null)
  }

  async function ask(question: string) {
    if (pending) return
    setError(null)
    run.current = { question, text: '', citations: [], steps: [], conflicts: [] }
    publish()
    let id = threadId
    await drive(() => id, async (signal) => {
      id = id ?? (await createThread.mutateAsync()).id
      onThread(id)
      await send.mutateAsync({ threadId: id, content: question, onEvent: apply, signal })
    })
  }

  async function decide(interruptId: string, decision: ConflictDecision) {
    const card = run.current?.conflicts.find((c) => c.interruptId === interruptId)
    if (!card || card.decision || !threadId) return
    setError(null)
    card.decision = decision
    publish()
    await drive(() => threadId, (signal) => resume.mutateAsync({ threadId, interruptId, decision, onEvent: apply, signal }))
  }

  function stop() {
    if (abort.current) abort.current.abort()
    else {
      // Stopping a paused run abandons the question.
      run.current = null
      setPending(null)
    }
  }

  return { messages, total: stored.data?.total ?? 0, hasOlder: !!stored.hasNextPage, loadingOlder: stored.isFetchingNextPage, loadOlder: () => stored.fetchNextPage().then((r) => !r.isError), loadingMessages: !!threadId && loadingMessages, pending, error, pills, conflicts, ask, decide, stop }
}
