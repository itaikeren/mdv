import { useEffect, useState, useMemo, memo } from 'react'
import mermaid from 'mermaid'

interface MermaidProps {
  chart: string
  id?: string
}

// Mermaid config stays constant across renders
const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
} as const

export const Mermaid = memo(function Mermaid({ chart, id }: MermaidProps) {
  const [svgContent, setSvgContent] = useState<string>('')
  const [isRendered, setIsRendered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate mermaid ID once per mount, not on every render
  const mermaidId = useMemo(
    () => id || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    [id]
  )

  useEffect(() => {
    let isMounted = true

    // Configure mermaid
    mermaid.initialize(MERMAID_CONFIG)

    const renderDiagram = async () => {
      try {
        if (!isMounted) return

        setError(null)
        setIsRendered(false)

        // Render the diagram
        const { svg } = await mermaid.render(mermaidId, chart)

        if (isMounted) {
          // Use React state instead of direct DOM manipulation
          setSvgContent(svg)
          setIsRendered(true)
        }
      } catch (err) {
        if (isMounted) {
          console.error('Mermaid rendering error:', err)
          setError(err instanceof Error ? err.message : 'Failed to render diagram')
          setIsRendered(false)
          setSvgContent('')
        }
      }
    }

    renderDiagram()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [chart, mermaidId])

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center mb-2">
          <span className="text-red-600 mr-2">⚠️</span>
          <span className="text-red-800 font-medium">Diagram Error</span>
        </div>
        <pre className="text-red-700 text-sm bg-red-100 p-2 rounded overflow-x-auto">
          {error}
        </pre>
        <details className="mt-2">
          <summary className="text-red-600 text-sm cursor-pointer">Show diagram source</summary>
          <pre className="text-gray-700 text-sm bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
            {chart}
          </pre>
        </details>
      </div>
    )
  }

  return (
    <div className="my-4 flex justify-center">
      <div
        className="w-full max-w-full overflow-x-auto bg-white border border-gray-200 rounded-lg p-4"
        style={{ minHeight: '200px' }}
      >
        {!isRendered && !error && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500 mr-2"></div>
            Rendering diagram...
          </div>
        )}
        {isRendered && svgContent && (
          <div
            className="flex justify-center"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  )
})
