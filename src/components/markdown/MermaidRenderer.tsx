import { useState, useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface MermaidRendererProps {
  definition: string
}

// Module-level counter — guarantees unique IDs even across separate React trees (e.g. in tests)
let mermaidInstanceCounter = 0

// Cache the mermaid singleton promise so concurrent callers share the same instance
let mermaidSingletonPromise: Promise<typeof import('mermaid')['default']> | null = null

function getMermaid() {
  if (!mermaidSingletonPromise) {
    mermaidSingletonPromise = import('mermaid').then(mod => {
      const mermaid = mod.default
      mermaid.initialize({ startOnLoad: false, theme: 'base' })
      return mermaid
    })
  }
  return mermaidSingletonPromise
}

export function MermaidRenderer({ definition }: MermaidRendererProps) {
  // useRef so the ID is stable for the lifetime of this component instance
  const idRef = useRef<string | null>(null)
  if (idRef.current === null) {
    idRef.current = `mermaid-${++mermaidInstanceCounter}`
  }
  const id = idRef.current
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
  // id is stable for the component lifetime (from useId) — only definition drives re-renders
  }, [definition]) // eslint-disable-line react-hooks/exhaustive-deps

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
