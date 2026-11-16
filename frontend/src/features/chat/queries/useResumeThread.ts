import { useMutation } from '@tanstack/react-query'
import type { ConflictDecision, StreamEvent } from '../schemas/chat'
import { resumeThread } from './chat'

export type ResumeVariables = {
  threadId: string
  interruptId: string
  decision: ConflictDecision
  onEvent: (e: StreamEvent) => void
  signal: AbortSignal
}

export const useResumeThread = () =>
  useMutation({
    mutationFn: ({ threadId, interruptId, decision, onEvent, signal }: ResumeVariables) =>
      resumeThread(threadId, interruptId, decision, onEvent, signal),
  })
