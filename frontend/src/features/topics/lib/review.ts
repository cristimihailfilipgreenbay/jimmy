import { topicNameSchema, type TopicDecision, type TopicReviewPayload } from '../schemas/topic'

// Where a proposed Topic stands while the Student checks the list. `new` is "not
// looked at yet"; it is saved like `approved`.
export type ItemState = 'new' | 'approved' | 'rename' | 'merge' | 'rejected'

export type ReviewItem = {
  id: string
  /** What Jimmy proposed. */
  original: string
  /** The name now: what the Student typed, or the proposal. */
  name: string
  state: ItemState
  /** For `merge`: the id of another proposed Topic or of one the Space already has. */
  into?: string
}

/** Jimmy proposes a merge for a Topic the Space already has. */
export const initialItems = (payload: TopicReviewPayload): ReviewItem[] =>
  payload.proposed.map((p) => ({
    id: p.id,
    original: p.name,
    name: p.name,
    state: p.existing_id ? 'merge' : 'new',
    into: p.existing_id ?? undefined,
  }))

/** The answer to send, or the problem the Student has to fix first. */
export function toDecisions(
  items: ReviewItem[],
  payload: TopicReviewPayload,
): { decisions: TopicDecision[] } | { error: string } {
  const existing = new Set(payload.existing.map((e) => e.id))
  const byId = new Map(items.map((i) => [i.id, i]))
  const decisions: TopicDecision[] = []
  for (const item of items) {
    if (item.state === 'rejected') decisions.push({ id: item.id, action: 'remove' })
    else if (item.state === 'merge') {
      const target = item.into ? byId.get(item.into) : undefined
      if (!item.into || (!existing.has(item.into) && (!target || target.state === 'rejected' || target.state === 'merge'))) {
        return { error: `Pick a Topic to merge “${item.name}” into, one that is kept.` }
      }
      decisions.push({ id: item.id, action: 'merge', into: item.into })
    } else if (item.name !== item.original) {
      const parsed = topicNameSchema.safeParse(item.name)
      if (!parsed.success) return { error: parsed.error.issues[0].message }
      decisions.push({ id: item.id, action: 'rename', name: parsed.data })
    } else decisions.push({ id: item.id, action: 'approve' })
  }
  return { decisions }
}
