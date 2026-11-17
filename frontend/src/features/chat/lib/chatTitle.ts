const MAX_TITLE = 58

/** A question as a chat title: one line, cut at a word with an ellipsis (as the server does). */
export function trimTitle(text: string) {
  const line = text.split(/\s+/).filter(Boolean).join(' ')
  if (line.length <= MAX_TITLE) return line
  const cut = line.slice(0, MAX_TITLE)
  const space = cut.lastIndexOf(' ')
  return `${(space > 30 ? cut.slice(0, space) : cut).replace(/[,.;:–\- ]+$/, '')}…`
}
