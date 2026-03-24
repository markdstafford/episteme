import { useEffect, useState, useRef } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { invoke } from '@tauri-apps/api/core'
import { Loader2 } from 'lucide-react'
import { parseDocument } from '@/lib/markdown'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import type { Preferences } from '@/lib/preferences'
import { DEFAULT_PREFERENCES } from '@/lib/preferences'

interface PreviewPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  path: string
  workspacePath: string
  onMouseEnter: () => void
  onMouseLeave: () => void
  /** Called with the scroll container ref so callers can programmatically focus it */
  scrollRefCallback?: (el: HTMLDivElement | null) => void
}

export function PreviewPopover({
  open,
  onOpenChange,
  path,
  workspacePath,
  onMouseEnter,
  onMouseLeave,
  scrollRefCallback,
}: PreviewPopoverProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewWidth, setPreviewWidth] = useState(DEFAULT_PREFERENCES.preview_width)
  const [previewHeight, setPreviewHeight] = useState(DEFAULT_PREFERENCES.preview_height)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load preview size preferences on mount
  useEffect(() => {
    invoke<Preferences>('load_preferences')
      .then((prefs) => {
        if (prefs.preview_width) setPreviewWidth(prefs.preview_width)
        if (prefs.preview_height) setPreviewHeight(prefs.preview_height)
      })
      .catch(() => {})
  }, [])

  // Forward scroll ref to caller for keyboard focus (Right Arrow)
  useEffect(() => {
    scrollRefCallback?.(scrollRef.current)
  })

  // Load file content when opened
  useEffect(() => {
    if (!open) {
      setContent(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setContent(null)
    invoke<string>('read_file', { filePath: path, workspacePath })
      .then((raw) => {
        if (cancelled) return
        const { content: body } = parseDocument(raw)
        setContent(body)
      })
      .catch(() => {
        if (!cancelled) setContent('')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, path, workspacePath])

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Anchor />
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{
            width: `min(${previewWidth}, 50vw)`,
            maxHeight: `min(${previewHeight}, 75vh)`,
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          <div
            ref={scrollRef}
            tabIndex={0}
            style={{
              overflowY: 'auto',
              maxHeight: `min(${previewHeight}, 75vh)`,
              padding: 'var(--space-4)',
              fontSize: 'var(--font-size-doc-sm)',
              outline: 'none',
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                <Loader2
                  className="animate-spin"
                  size={20}
                  style={{ color: 'var(--color-text-tertiary)' }}
                />
              </div>
            ) : content !== null ? (
              <MarkdownRenderer
                content={content}
                className="prose prose-tiptap dark:prose-invert max-w-none"
              />
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
