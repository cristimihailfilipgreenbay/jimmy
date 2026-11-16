import { useMutation } from '@tanstack/react-query'
import type { StreamEvent } from '../schemas/chat'
import { sendMessage } from './chat'

export type SendVariables = { threadId: string; content: string; onEvent: (e: StreamEvent) => void; signal: AbortSignal }

export const useSendMessage = () =>
  useMutation({ mutationFn: ({ threadId, content, onEvent, signal }: SendVariables) => sendMessage(threadId, content, onEvent, signal) })
