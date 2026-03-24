import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock mermaid dynamic import
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}))

import mermaid from 'mermaid'
import { MermaidRenderer } from '@/components/markdown/MermaidRenderer'

describe('MermaidRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders SVG on successful mermaid render', async () => {
    vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg><text>diagram</text></svg>' } as any)
    const { container } = render(<MermaidRenderer definition="graph TD\nA-->B" />)
    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  it('renders error state when mermaid render fails', async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('parse error'))
    const { getByText } = render(<MermaidRenderer definition="invalid mermaid" />)
    await waitFor(() => {
      expect(getByText('Diagram could not be rendered')).toBeInTheDocument()
    })
  })

  it('shows raw definition in error state', async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('parse error'))
    const { container } = render(<MermaidRenderer definition={'graph TD\nA-->B'} />)
    await waitFor(() => {
      expect(container.querySelector('code')).toBeInTheDocument()
      expect(container.querySelector('code')?.textContent).toBe('graph TD\nA-->B')
    })
  })

  it('generates unique render IDs across instances', async () => {
    vi.mocked(mermaid.render).mockReturnValue(new Promise(() => {})) // never resolves
    render(<MermaidRenderer definition="graph TD\nA-->B" />)
    render(<MermaidRenderer definition="graph TD\nC-->D" />)
    await waitFor(() => {
      expect(vi.mocked(mermaid.render).mock.calls.length).toBeGreaterThanOrEqual(2)
    })
    const calls = vi.mocked(mermaid.render).mock.calls
    expect(calls[0][0]).not.toBe(calls[1][0])
  })
})
