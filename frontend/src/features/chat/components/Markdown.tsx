import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { hasBlocks } from '../lib/markdown'

// Lists, headings, quotes, code and tables inside an answer paragraph. Raw HTML in the
// text is never rendered (react-markdown escapes it), so a Source cannot inject markup.
const blocks: Components = {
  h1: ({ children }) => <h3 className="mt-3 mb-1 text-lg font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-3 mb-1 text-lg font-semibold">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-2 mb-1 font-semibold">{children}</h4>,
  h4: ({ children }) => <h4 className="mt-2 mb-1 font-semibold">{children}</h4>,
  p: ({ children }) => <p className="my-1.5">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="my-1.5 border-l-2 border-border pl-3 text-muted-foreground">{children}</blockquote>,
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-sm leading-snug">{children}</pre>,
  code: ({ children, className }) => <code className={className ?? 'rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]'}>{children}</code>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border bg-muted px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
  hr: () => <hr className="my-3 border-border" />,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-space-ink underline underline-offset-2">
      {children}
    </a>
  ),
}

// A one-line paragraph stays inline, so its Citation chips can follow it on the same line.
const inline: Components = { ...blocks, p: ({ children }) => <>{children}</> }

export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={hasBlocks(text) ? blocks : inline}>
      {text}
    </ReactMarkdown>
  )
}
