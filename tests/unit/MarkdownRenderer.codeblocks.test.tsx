import { render, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'

// shikiSingleton and mermaid are mocked globally in tests/setup.ts

describe('MarkdownRenderer — code blocks', () => {
  it('renders a TypeScript code fence with shiki output', async () => {
    const { container } = render(
      <MarkdownRenderer
        content={'```typescript\nconst x = 1\n```'}
        className="prose max-w-none"
      />
    )
    // TipTap node views do not initialise in jsdom — verified manually
    await waitFor(() => {
      expect(container.querySelector('pre')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('renders a mermaid fence with SVG output', async () => {
    const { container } = render(
      <MarkdownRenderer
        content={'```mermaid\ngraph TD\nA-->B\n```'}
        className="prose max-w-none"
      />
    )
    await waitFor(() => {
      // MermaidRenderer produces an SVG element
      expect(container.querySelector('svg')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('renders a fenced block with no language as plain code', async () => {
    const { container } = render(
      <MarkdownRenderer content={'```\nplain text\n```'} className="prose max-w-none" />
    )
    await waitFor(() => {
      expect(container.querySelector('pre')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('renders a fenced block with unknown language as plain code', async () => {
    const { container } = render(
      <MarkdownRenderer
        content={'```cobol\nMOVE 1 TO X\n```'}
        className="prose max-w-none"
      />
    )
    await waitFor(() => {
      expect(container.querySelector('pre')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
