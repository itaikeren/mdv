import React, { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { highlightCode } from '../utils/highlighter'
import { Mermaid } from './mermaid'

// Utility function to generate ID from heading text
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
}

// Custom heading components with IDs for anchor links
function HeadingRenderer({ level, children }: { level: number; children: ReactNode }) {
  const text = React.Children.toArray(children).join('')
  const id = generateHeadingId(text)

  const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements

  return (
    <HeadingTag id={id} className={`heading-${level}`}>
      {children}
    </HeadingTag>
  )
}

// Custom link component with smooth scrolling for anchor links
function LinkRenderer({ href, children }: { href?: string; children: ReactNode }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (href?.startsWith('#')) {
      e.preventDefault()
      const targetId = href.slice(1) // Remove the # prefix
      const targetElement = document.getElementById(targetId)

      if (targetElement) {
        // Get header height dynamically
        const header = document.querySelector('header')
        const headerHeight = header ? header.offsetHeight : 80 // fallback to 80px

        // Add extra padding for better visual spacing (24px)
        const offset = headerHeight + 24

        // Calculate the target position with offset
        const elementPosition = targetElement.offsetTop
        const offsetPosition = elementPosition - offset

        // Smooth scroll to the adjusted position
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="text-slate-900 hover:text-slate-700 underline decoration-slate-900/30 hover:decoration-slate-700/50 transition-colors"
    >
      {children}
    </a>
  )
}

interface PreviewProps {
  markdown: string
}

interface CodeBlockProps {
  children?: ReactNode
  className?: string
}

function CodeBlock({ children, className }: CodeBlockProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('')

  const code = String(children).replace(/\n$/, '')

  // Check if this is a code block or inline code
  // Code blocks either have language- class OR contain newlines
  const isCodeBlock = className?.startsWith('language-') || code.includes('\n')

  // Check if this is a mermaid diagram
  const language = className?.replace('language-', '') || 'text'
  const isMermaid = language === 'mermaid'

  useEffect(() => {
    if (!isCodeBlock || isMermaid) return

    highlightCode(code, language, 'light')
      .then(setHighlightedCode)
      .catch(() => {
        // Fallback to plain code block if highlighting fails
        setHighlightedCode(`<pre><code>${code}</code></pre>`)
      })
  }, [children, className, isCodeBlock, code, isMermaid, language])

  // Inline code - just return a styled span
  if (!isCodeBlock) {
    return (
      <code className="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono text-slate-700">
        {children}
      </code>
    )
  }

  // Mermaid diagram - use Mermaid component
  if (isMermaid) {
    return <Mermaid chart={code} />
  }

  // Code block - use syntax highlighting
  if (!highlightedCode) {
    return (
      <pre className="bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-x-auto">
        <code className="text-sm font-mono">{children}</code>
      </pre>
    )
  }

  return (
    <div
      className="my-4 overflow-x-auto rounded-lg border border-slate-200"
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
    />
  )
}

export function Preview({ markdown }: PreviewProps) {
  return (
    <div className="
      h-full overflow-y-auto
      bg-white border border-slate-200
      p-6 rounded-xl
    ">
      {markdown ? (
        <div className="prose prose-gray max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: CodeBlock,
              pre: ({ children }) => <div>{children}</div>,
              h1: ({ children }) => <HeadingRenderer level={1} children={children} />,
              h2: ({ children }) => <HeadingRenderer level={2} children={children} />,
              h3: ({ children }) => <HeadingRenderer level={3} children={children} />,
              h4: ({ children }) => <HeadingRenderer level={4} children={children} />,
              h5: ({ children }) => <HeadingRenderer level={5} children={children} />,
              h6: ({ children }) => <HeadingRenderer level={6} children={children} />,
              a: ({ href, children }) => <LinkRenderer href={href} children={children} />
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-slate-400">
          <p className="text-center">
            <span className="block text-2xl mb-2">📝</span>
            Start typing markdown to see the preview...
          </p>
        </div>
      )}
    </div>
  )
}