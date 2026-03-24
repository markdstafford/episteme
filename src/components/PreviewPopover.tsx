import { useEffect, useState, useRef } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { invoke } from '@tauri-apps/api/core'
import { Loader2 } from 'lucide-react'
import { parseDocument } from '@/lib/markdown'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { parsePreferences } from '@/lib/preferences'

// Design token values — must stay in sync with app.css @theme
const SIDEBAR_WIDTH_PX = 244  // --width-sidebar
const TITLEBAR_HEIGHT_PX = 32 // --height-titlebar

function percentToPx(pctStr: string, total: number): number {
  return Math.round((parseFloat(pctStr) / 100) * total)
}

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
  // Pixel dimensions computed from % preferences at open time — not live-updated while visible
  const [widthPx, setWidthPx] = useState(0)
  const [heightPx, setHeightPx] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Forward scroll ref to caller for keyboard focus (Right Arrow)
  useEffect(() => {
    scrollRefCallback?.(scrollRef.current)
    return () => scrollRefCallback?.(null)
  }, [scrollRefCallback])

  // Load preferences and file content when first opened — deferred to avoid
  // firing invoke("load_preferences") for every .md row in the tree on mount
  useEffect(() => {
    if (!open) {
      setContent(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setContent(null)

    // Load preferences and compute pixel dimensions from % relative to the content pane.
    // Computed once at open time — not live-updated while the popover is visible.
    invoke('load_preferences')
      .then((raw) => {
        if (cancelled) return
        const prefs = parsePreferences(raw)
        const contentW = window.innerWidth - SIDEBAR_WIDTH_PX
        const contentH = window.innerHeight - TITLEBAR_HEIGHT_PX
        setWidthPx(percentToPx(prefs.preview_width, contentW))
        setHeightPx(percentToPx(prefs.preview_height, contentH))
      })
      .catch(() => {})

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
            width: widthPx > 0 ? `${widthPx}px` : undefined,
            maxHeight: heightPx > 0 ? `${heightPx}px` : undefined,
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
              maxHeight: heightPx > 0 ? `${heightPx}px` : undefined,
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
