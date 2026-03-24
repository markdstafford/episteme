import { useState, useEffect } from 'react'
import { getHighlighter } from '@/lib/shikiSingleton'

interface ShikiRendererProps {
  code: string
  language: string
}

export function ShikiRenderer({ code, language }: ShikiRendererProps) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    setHtml(null) // Clear stale output immediately when props change
    let cancelled = false

    getHighlighter()
      .then(hl => {
        const loadedLangs = hl.getLoadedLanguages()
        const lang = loadedLangs.includes(language as any) ? language : 'text'
        const highlighted = hl.codeToHtml(code, {
          lang,
          themes: {
            light: 'Catppuccin Latte',
            dark: 'Catppuccin Mocha',
          },
        })
        if (!cancelled) setHtml(highlighted)
      })
      .catch(() => {
        // Silent fallback — plain <pre><code> is already shown as loading state
      })

    return () => {
      cancelled = true
    }
  }, [code, language])

  if (html !== null) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <pre>
      <code>{code}</code>
    </pre>
  )
}
