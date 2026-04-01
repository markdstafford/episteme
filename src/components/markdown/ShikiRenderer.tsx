import { useState, useEffect } from 'react'
import { getHighlighter } from '@/lib/shikiSingleton'
import { CopyButton } from '@/components/ui/CopyButton'

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
    return (
      <div className="relative group">
        <CopyButton
          text={code}
          className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    )
  }

  return (
    <div className="relative group">
      <CopyButton
        text={code}
        className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}
