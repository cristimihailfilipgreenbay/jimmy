import { z } from 'zod'
import { ApiError, request, requestStream } from '@/lib/http'
import { messageSchema, streamEventSchema, threadSchema, type StreamEvent } from '../schemas/chat'

export const listThreads = (spaceId: string) => request(`/spaces/${spaceId}/threads`, z.array(threadSchema))
export const createThread = (spaceId: string) => request(`/spaces/${spaceId}/threads`, threadSchema, { method: 'POST' })
export const listMessages = (threadId: string) => request(`/threads/${threadId}/messages`, z.array(messageSchema))

/** Sends a question and calls `onEvent` for each server-sent event until the stream ends. */
export async function sendMessage(threadId: string, content: string, onEvent: (e: StreamEvent) => void, signal: AbortSignal) {
  const res = await requestStream(`/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ content }), signal })
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
