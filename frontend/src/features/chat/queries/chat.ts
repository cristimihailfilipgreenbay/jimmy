import { z } from 'zod'
import { ApiError, request, requestStream } from '@/lib/http'
import { messageSchema, streamEventSchema, threadSchema, type ConflictDecision, type StreamEvent } from '../schemas/chat'

export const listThreads = (spaceId: string) => request(`/spaces/${spaceId}/threads`, z.array(threadSchema))
export const createThread = (spaceId: string) => request(`/spaces/${spaceId}/threads`, threadSchema, { method: 'POST' })
export const listMessages = (threadId: string) => request(`/threads/${threadId}/messages`, z.array(messageSchema))

/** Calls `onEvent` for each server-sent event of a response until the stream ends. */
async function readEvents(res: Response, onEvent: (e: StreamEvent) => void) {
  if (!res.body) throw new ApiError(res.status, 'unknown', 'The answer did not stream.')
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    for (const block of blocks) {
      const type = /^event: (.+)$/m.exec(block)?.[1]
      const data = /^data: (.+)$/m.exec(block)?.[1]
      if (!type || !data) continue
      const parsed = streamEventSchema.safeParse({ type, ...JSON.parse(data) })
      if (parsed.success) onEvent(parsed.data)
    }
  }
}

/** Sends a question and streams the answer. */
export async function sendMessage(threadId: string, content: string, onEvent: (e: StreamEvent) => void, signal: AbortSignal) {
  const res = await requestStream(`/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ content }), signal })
  await readEvents(res, onEvent)
}

/** Answers a pause and streams the rest of the answer. */
export async function resumeThread(
  threadId: string,
  interruptId: string,
  decision: ConflictDecision,
  onEvent: (e: StreamEvent) => void,
  signal: AbortSignal,
) {
  const res = await requestStream(`/threads/${threadId}/resume`, {
    method: 'POST',
    body: JSON.stringify({ interrupt_id: interruptId, decision }),
    signal,
  })
  await readEvents(res, onEvent)
}
