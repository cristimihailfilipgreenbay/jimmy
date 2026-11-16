import { useEffect, useRef } from 'react'
import { Check, Loader2, TriangleAlert } from 'lucide-react'
import { useParams } from 'react-router'
import { Placeholder } from '@/components/Placeholder'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { useLibrary } from '@/features/library/queries/useLibrary'
import { useDocuments } from '@/features/notes/queries/useDocuments'
import { useTopics } from '@/features/topics/queries/useTopics'
import { useSpaces } from '@/features/spaces/queries/useSpaces'
import { cn } from '@/lib/utils'
import { AnswerMessage, UserMessage } from './components/AnswerMessage'
import { ChatEmpty } from './components/ChatEmpty'
import { Composer } from './components/Composer'
import { SourceGuide } from './components/SourceGuide'
import { useSpaceEvents } from '@/features/learned/queries/useSpaceEvents'
import { stepLabel, stepMeta, useChat } from './hooks/useChat'

// A Study Space's chat: cited answers from its Notes, streamed as they are written.
export function ChatPage() {
  const { spaceId = '' } = useParams()
  const student = useSignedInStudent()
  const { data: spaces, isPending } = useSpaces(student.id)
  const { data: documents, isPending: loadingNotes } = useDocuments(student.id, spaceId)
  const { data: topics, isPending: loadingTopics } = useTopics(student.id, spaceId)
  const { data: library, isPending: loadingLibrary } = useLibrary(student.id, spaceId)
  const chat = useChat(student.id, spaceId)
  useSpaceEvents(student.id, spaceId)
  const end = useRef<HTMLDivElement>(null)
  const space = spaces?.find((s) => s.id === spaceId)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [chat.messages.length, chat.pending?.text, chat.pending?.steps.length])

  if (isPending) return null
  if (!space) return <Placeholder title="Study Space not found" note="That Study Space does not exist." />
  const ready = documents?.filter((d) => d.status === 'ready') ?? []
  const empty = !chat.loadingMessages && chat.messages.length === 0 && !chat.pending
  const settled = !loadingNotes && !loadingTopics && !loadingLibrary

  return (
    <div className="grid gap-6 pt-4 pb-6 lg:grid-cols-[1fr_300px]">
      <div className="flex min-h-[calc(100vh-7.5rem)] flex-col">
        <h1 className="sr-only">Chat · {space.name}</h1>
        <div className="flex-1 space-y-6 pb-4" aria-live="polite" aria-busy={!!chat.pending}>
          {empty && settled && (
            <ChatEmpty
              spaceId={space.id}
              spaceName={space.name}
              notes={ready}
              topics={topics ?? []}
              libraryOn={!!library?.enabled && library.status !== 'none'}
              onAsk={chat.ask}
            />
          )}
          {chat.messages.map((m) =>
            m.role === 'user' ? (
              <UserMessage key={m.id} text={m.content} />
            ) : (
              <AnswerMessage key={m.id} content={m.content} citations={m.citations} tools={chat.pills[m.id]} />
            ),
          )}
          {chat.pending && (
            <>
              <UserMessage text={chat.pending.question} />
              <AnswerMessage content={chat.pending.text} citations={chat.pending.citations} streaming />
            </>
          )}
          {chat.error && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted p-2.5 text-sm" role="alert">
              <TriangleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
              <span>{chat.error}</span>
            </div>
          )}
          <div ref={end} />
        </div>
        <div className="sticky bottom-16 z-10 bg-background md:bottom-0">
          {chat.pending && chat.pending.steps.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm" role="status" aria-live="polite">
              {chat.pending.steps.map((s, i) => (
                <span key={i} className={cn('inline-flex items-center gap-1.5', s.state === 'run' ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {s.state === 'run' ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
                  {stepLabel(s)}
                  {stepMeta(s) && <span className="text-xs">· {stepMeta(s)}</span>}
                </span>
              ))}
            </div>
          )}
          <Composer empty={empty} spaceName={space.name} busy={!!chat.pending} onSend={chat.ask} onStop={chat.stop} />
        </div>
      </div>
      <SourceGuide space={space} />
    </div>
  )
}
