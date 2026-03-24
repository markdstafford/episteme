import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/shikiSingleton')

import { getHighlighter } from '@/lib/shikiSingleton'
import { ShikiRenderer } from '@/components/markdown/ShikiRenderer'

const mockHighlighter = {
  codeToHtml: vi.fn(),
  getLoadedLanguages: vi.fn(),
}

describe('ShikiRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHighlighter.getLoadedLanguages.mockReturnValue(['typescript', 'javascript'])
    vi.mocked(getHighlighter).mockResolvedValue(mockHighlighter as any)
  })

  it('renders plain code immediately before highlighter resolves', () => {
    vi.mocked(getHighlighter).mockReturnValue(new Promise(() => {})) // never resolves
    const { container } = render(
      <ShikiRenderer code="const x = 1" language="typescript" />
    )
    expect(container.querySelector('pre')).toBeInTheDocument()
    expect(container.querySelector('code')).toBeInTheDocument()
  })

  it('renders highlighted HTML after highlighter resolves', async () => {
    mockHighlighter.codeToHtml.mockReturnValue('<pre class="shiki"><code>highlighted</code></pre>')
    const { container } = render(
      <ShikiRenderer code="const x = 1" language="typescript" />
    )
    await waitFor(() => {
      expect(container.querySelector('.shiki')).toBeInTheDocument()
    })
  })

  it('falls back to plain code for unknown language', async () => {
    mockHighlighter.getLoadedLanguages.mockReturnValue(['typescript'])
    mockHighlighter.codeToHtml.mockReturnValue('<pre class="shiki"><code>plain</code></pre>')
    render(<ShikiRenderer code="some code" language="unknownlang" />)
    await waitFor(() => {
      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
        'some code',
        expect.objectContaining({ lang: 'text' })
      )
    })
  })

  it('silently falls back to plain code on highlighter error', async () => {
    vi.mocked(getHighlighter).mockRejectedValue(new Error('failed'))
    const { container } = render(
      <ShikiRenderer code="const x = 1" language="typescript" />
    )
    // Should still show plain code (no error UI)
    expect(container.querySelector('pre')).toBeInTheDocument()
  })
})
