import { useState, useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { CopyButton } from '@/components/ui/CopyButton'

interface MermaidRendererProps {
  definition: string
}

// Module-level counter — guarantees unique IDs even across separate React trees (e.g. in tests)
let mermaidInstanceCounter = 0

// Cache the mermaid module load (expensive) — theme is set per-render via initialize()
let mermaidSingletonPromise: Promise<typeof import('mermaid')['default']> | null = null

function getMermaid() {
  if (!mermaidSingletonPromise) {
    mermaidSingletonPromise = import('mermaid').then(mod => mod.default)
  }
  return mermaidSingletonPromise
}

function getIsDark() {
  return typeof window !== 'undefined' && !!window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
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
  const [isDark, setIsDark] = useState(getIsDark)

  // Re-render when the system color scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    setSvg(null)    // Clear stale state immediately when definition or theme changes
    setError(false)
    let cancelled = false

    getMermaid()
      .then(m => {
        // Re-initialize with correct theme before each render so color scheme changes take effect
        m.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' })
        return m.render(id, definition)
      })
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) setSvg(renderedSvg)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  // id is stable for the component lifetime — excluded from deps intentionally
  }, [definition, isDark]) // eslint-disable-line react-hooks/exhaustive-deps

  if (svg !== null) {
    return (
      <div className="relative group" style={{ maxWidth: '100%', overflow: 'hidden' }}>
        <CopyButton
          text={definition}
          className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="relative group"
        style={{
          border: '1px solid var(--color-border-default)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
        }}
      >
        <CopyButton
          text={definition}
          className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        />
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
