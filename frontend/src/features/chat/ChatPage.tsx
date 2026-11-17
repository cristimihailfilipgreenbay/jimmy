import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, Loader2, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useParams, useSearchParams } from 'react-router'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Placeholder } from '@/components/Placeholder'
import { useSignedInStudent } from '@/features/auth/hooks/useSignedInStudent'
import { useLibrary } from '@/features/library/queries/useLibrary'
import { useDocuments } from '@/features/notes/queries/useDocuments'
import { useWeakTopics } from '@/features/study/queries/useWeakTopics'
import { useTopics } from '@/features/topics/queries/useTopics'
import { useSpace } from '@/features/spaces/queries/useSpace'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { AnswerMessage, UserMessage } from './components/AnswerMessage'
import { ChatContextMenu } from './components/ChatContextMenu'
import { ChatEmpty } from './components/ChatEmpty'
import { ChatHeader } from './components/ChatHeader'
import { ChatList } from './components/ChatList'
import { ChatSheet } from './components/ChatSheet'
import { ChatSidePanel, type Side } from './components/ChatSidePanel'
import { Composer } from './components/Composer'
import { RenameChatDialog } from './components/RenameChatDialog'
import { SourceGuide } from './components/SourceGuide'
import { useSpaceEvents } from '@/features/learned/queries/useSpaceEvents'
import { chatStatus, stepLabel, stepMeta, useChat } from './hooks/useChat'
import { chatWhen } from './lib/chatDates'
import { trimTitle } from './lib/chatTitle'
import { useDeleteChat, useThreads } from './queries/useThreads'
import type { ThreadItem } from './schemas/chat'

type Menu = { chat: Pick<ThreadItem, 'id' | 'title'> & Partial<ThreadItem>; x: number; y: number; returnTo: HTMLElement | null }

// A Study Space's chat: cited answers from its Notes, streamed as they are written.
export function ChatPage() {
  const { spaceId = '' } = useParams()
  const student = useSignedInStudent()
  const { data: space, isPending } = useSpace(student.id, spaceId)
  const { data: documents, isPending: loadingNotes } = useDocuments(student.id, spaceId)
  const { data: topics, isPending: loadingTopics } = useTopics(student.id, spaceId)
  const { data: weak, isPending: loadingWeak } = useWeakTopics(student.id, spaceId)
  const { data: library, isPending: loadingLibrary } = useLibrary(student.id, spaceId)
  // Which chat is open lives in the address (?chat=<id>, or ?chat=new for one not started
  // yet); with neither, the most recent chat is open.
  const [params, setParams] = useSearchParams()
  const asked = params.get('chat')
  const threads = useThreads(student.id, spaceId)
  const chats = threads.data?.chats ?? []
  const latest = chats[0]?.id
  const threadId = asked === 'new' ? undefined : (asked ?? latest)
  const draft = !threads.isPending && !threadId
  const openChat = (id: string | null) =>
    setParams(
      (old) => {
        const next = new URLSearchParams(old)
        if (id) next.set('chat', id)
        else next.delete('chat')
        return next
      },
      { replace: true },
    )
  const chat = useChat(student.id, spaceId, threadId, (id) => openChat(id))
  const remove = useDeleteChat(student.id, spaceId)
  const [side, setSide] = useState<Side>('chats')
  const [sheet, setSheet] = useState(false)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [renaming, setRenaming] = useState<ThreadItem | null>(null)
  const [deleting, setDeleting] = useState<ThreadItem | null>(null)
  useSpaceEvents(student.id, spaceId)
  const end = useRef<HTMLDivElement>(null)

  // The first scroll, when the history has just loaded, jumps; later ones glide.
  const scrolled = useRef(false)
  const shownThread = useRef(threadId)
  // Only a new last message (not older ones loaded above) scrolls down.
  const lastId = chat.messages.at(-1)?.id
  useEffect(() => {
    if (chat.loadingMessages) return
    // Opening another chat jumps to its latest message; a new message in this one glides.
    const switched = shownThread.current !== threadId
    shownThread.current = threadId
    end.current?.scrollIntoView({ block: 'end', behavior: scrolled.current && !switched ? 'smooth' : 'instant' })
    scrolled.current = true
  }, [chat.loadingMessages, threadId, lastId, chat.pending?.text, chat.pending?.steps.length, chat.pending?.conflicts.length])

  // Older messages appear above what is on screen; keep the same message where it was.
  const anchor = useRef<{ height: number; top: number } | null>(null)
  const count = chat.messages.length
  useLayoutEffect(() => {
    const a = anchor.current
    if (!a) return
    anchor.current = null
    window.scrollTo({ top: a.top + (document.documentElement.scrollHeight - a.height), behavior: 'instant' })
  }, [count])
  const loadOlder = () => {
    anchor.current = { height: document.documentElement.scrollHeight, top: window.scrollY }
    // A failed load leaves nothing to keep in place.
    chat.loadOlder().then((ok) => {
      if (!ok) anchor.current = null
    })
  }

  if (isPending) return null
  if (!space) return <Placeholder title="Study Space not found" note="That Study Space does not exist." />
  const ready = documents?.filter((d) => d.status === 'ready') ?? []
  const empty = !threads.isPending && !chat.loadingMessages && chat.messages.length === 0 && !chat.pending
  const settled = !loadingNotes && !loadingTopics && !loadingLibrary && !loadingWeak

  // The header and the menu describe the open chat. It may not be in the pages of the list
  // that are loaded, so what is missing comes from its messages.
  const first = chat.messages.find((m) => m.role === 'user')
  const listed = chats.find((c) => c.id === threadId)
  const messageCount = listed?.message_count ?? chat.total
  const started = listed?.created_at ?? chat.messages[0]?.created_at
  const current: ThreadItem | null = threadId
    ? (listed ?? {
        id: threadId,
        title: first ? trimTitle(first.content) : 'Chat',
        created_at: started ?? new Date().toISOString(),
        updated_at: chat.messages.at(-1)?.created_at ?? new Date().toISOString(),
        message_count: messageCount,
      })
    : null
  const subtitle =
    current && messageCount > 0 && started
      ? `Started ${chatWhen(started).replace(/^./, (c) => c.toLowerCase())} · ${messageCount} message${messageCount === 1 ? '' : 's'}`
      : `${space.name} · not started yet`
  const busy = !!chat.pending
  const openFromList = (id: string) => {
    setSheet(false)
    openChat(id)
  }
  const newChat = () => {
    setSheet(false)
    openChat('new')
  }
  const showMenu = (c: Pick<ThreadItem, 'id' | 'title'>, x: number, y: number, returnTo: HTMLElement | null) => setMenu({ chat: c, x, y, returnTo })
  // Rename and Delete need the whole chat; the menu of a listed one has it.
  const whole = (id: string) => (id === current?.id ? current : (chats.find((c) => c.id === id) ?? null))
  const list = (scroll: boolean) => (
    <ChatList
      chats={chats}
      total={threads.data?.total ?? 0}
      loading={threads.isPending}
      hasMore={!!threads.hasNextPage}
      loadingMore={threads.isFetchingNextPage}
      onMore={() => threads.fetchNextPage()}
      openId={threadId}
      draft={draft}
      busy={busy}
      scroll={scroll}
      onOpen={openFromList}
      onNew={newChat}
      onMenu={showMenu}
    />
  )

  return (
    <div className="grid gap-6 pt-4 pb-1 lg:grid-cols-[1fr_300px]">
      <div className="flex min-h-[calc(100vh-7.5rem)] min-w-0 flex-col">
        <h1 className="sr-only">Chat · {space.name}</h1>
        <ChatHeader
          title={threadId ? (current?.title ?? 'Chat') : 'New chat'}
          subtitle={subtitle}
          chatCount={threads.data?.total ?? 0}
          canOpenMenu={!!current && messageCount > 0}
          newDisabled={draft || busy}
          onChats={() => setSheet(true)}
          onMenu={(x, y, el) => current && showMenu(current, x, y, el)}
          onNew={newChat}
        />
        <div className="flex-1 space-y-6 pb-4" aria-live="polite" aria-busy={!!chat.pending}>
          {empty && settled && (
            <ChatEmpty
              spaceId={space.id}
              spaceName={space.name}
              notes={ready}
              topics={topics?.topics ?? []}
              weak={weak?.weak ?? []}
              libraryOn={!!library?.enabled && library.status !== 'none'}
              onAsk={chat.ask}
            />
          )}
          {empty && settled && latest && (
            <p className="text-center">
              <Button variant="link" size="sm" onClick={() => openChat(latest)}>
                ← Back to your last chat
              </Button>
            </p>
          )}
          {chat.hasOlder && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" disabled={chat.loadingOlder} onClick={loadOlder}>
                {chat.loadingOlder && <Loader2 className="animate-spin" />} Show earlier messages
              </Button>
            </div>
          )}
          {chat.messages.map((m) =>
            m.role === 'user' ? (
              <UserMessage key={m.id} text={m.content} />
            ) : (
              <AnswerMessage key={m.id} content={m.content} citations={m.citations} tools={chat.pills[m.id]} spaceId={space.id} conflicts={chat.conflicts[m.id]} />
            ),
          )}
          {chat.pending && (
            <>
              <UserMessage text={chat.pending.question} />
              <AnswerMessage
                content={chat.pending.text}
                citations={chat.pending.citations}
                spaceId={space.id}
                conflicts={chat.pending.conflicts}
                onDecide={chat.decide}
                streaming
                status={chatStatus(chat.pending)}
              />
            </>
          )}
          {chat.error && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted p-2.5 text-sm" role="alert">
              <TriangleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
              <span>{chat.error}</span>
            </div>
          )}
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
        {/* After the composer, which sticks over the bottom of the page: scrolling here keeps the last message above it. */}
        <div ref={end} />
      </div>
      <ChatSidePanel side={side} onSide={setSide} chatCount={threads.data?.total ?? 0} chats={list(true)} sources={<SourceGuide space={space} />} />
      <ChatSheet open={sheet} spaceName={space.name} onClose={() => setSheet(false)}>
        {list(false)}
      </ChatSheet>
      {menu && (
        <ChatContextMenu
          key={`${menu.chat.id}-${menu.x}-${menu.y}`}
          {...menu}
          onClose={() => setMenu(null)}
          onRename={() => {
            setRenaming(whole(menu.chat.id))
            setMenu(null)
          }}
          onDelete={() => {
            setDeleting(whole(menu.chat.id))
            setMenu(null)
          }}
        />
      )}
      <RenameChatDialog studentId={student.id} spaceId={spaceId} chat={renaming} onClose={() => setRenaming(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this chat?"
        description={`“${deleting?.title ?? ''}” and its ${deleting?.message_count ?? 0} messages will be deleted. Your notes, flashcards and weak topics stay as they are.`}
        confirmLabel="Delete chat"
        pending={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast('Chat deleted', Trash2)
              // Deleting the open chat opens the most recent one that is left.
              if (deleting.id === threadId) openChat(null)
              setDeleting(null)
            },
          })
        }
      />
    </div>
  )
}
