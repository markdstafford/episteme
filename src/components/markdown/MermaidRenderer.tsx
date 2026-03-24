import { useState, useEffect, useId } from 'react'
import { AlertTriangle } from 'lucide-react'

interface MermaidRendererProps {
  definition: string
}

let mermaidInitialized = false

async function getMermaid() {
  const mermaidModule = await import('mermaid')
  const mermaid = mermaidModule.default
  if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, theme: 'base' })
    mermaidInitialized = true
  }
  return mermaid
}

export function MermaidRenderer({ definition }: MermaidRendererProps) {
  const rawId = useId()
  // useId returns ':r0:' style strings — sanitize for mermaid's ID requirement
  const id = `mermaid-${rawId.replace(/:/g, '')}`
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    getMermaid()
      .then(m => m.render(id, definition))
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) setSvg(renderedSvg)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [definition, id])

  if (svg !== null) {
    return (
      <div
        style={{ maxWidth: '100%', overflow: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }

  if (error) {
    return (
      <div
        style={{
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--color-state-warning)' }} />
          <span
            style={{
              fontSize: 'var(--font-size-ui-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Diagram could not be rendered
          </span>
        </div>
        <pre
          style={{
            opacity: 0.5,
            fontSize: 'var(--font-size-ui-sm)',
            fontFamily: 'var(--font-mono)',
            margin: 0,
          }}
        >
          <code>{definition}</code>
        </pre>
      </div>
    )
  }

  // Loading state — render nothing while mermaid initialises
  return null
}
