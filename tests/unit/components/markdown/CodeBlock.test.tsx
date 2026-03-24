import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/markdown/ShikiRenderer', () => ({
  ShikiRenderer: ({ code, language }: { code: string; language: string }) => (
    <div data-testid="shiki-renderer" data-code={code} data-language={language} />
  ),
}))

vi.mock('@/components/markdown/MermaidRenderer', () => ({
  MermaidRenderer: ({ definition }: { definition: string }) => (
    <div data-testid="mermaid-renderer" data-definition={definition} />
  ),
}))

import type { ReactNode } from 'react'

vi.mock('@tiptap/react', () => ({
  ReactNodeViewRenderer: vi.fn(),
  NodeViewWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

import { CodeBlockDispatcher } from '@/components/markdown/CodeBlock'

function makeNode(language: string | null, textContent: string) {
  return { attrs: { language }, textContent }
}

describe('CodeBlockDispatcher', () => {
  it('renders ShikiRenderer for a TypeScript code block', () => {
    const { getByTestId } = render(
      <CodeBlockDispatcher node={makeNode('typescript', 'const x = 1') as any} />
    )
    expect(getByTestId('shiki-renderer')).toBeInTheDocument()
  })

  it('renders MermaidRenderer when language is mermaid', () => {
    const { getByTestId } = render(
      <CodeBlockDispatcher node={makeNode('mermaid', 'graph TD\nA-->B') as any} />
    )
    expect(getByTestId('mermaid-renderer')).toBeInTheDocument()
  })

  it('renders ShikiRenderer when language is null', () => {
    const { getByTestId } = render(
      <CodeBlockDispatcher node={makeNode(null, 'some code') as any} />
    )
    expect(getByTestId('shiki-renderer')).toBeInTheDocument()
  })

  it('passes code and language to ShikiRenderer', () => {
    const { getByTestId } = render(
      <CodeBlockDispatcher node={makeNode('python', 'print("hello")') as any} />
    )
    const el = getByTestId('shiki-renderer')
    expect(el.dataset.code).toBe('print("hello")')
    expect(el.dataset.language).toBe('python')
  })

  it('passes definition to MermaidRenderer', () => {
    const definition = 'graph TD\nA-->B'
    const { getByTestId } = render(
      <CodeBlockDispatcher node={makeNode('mermaid', definition) as any} />
    )
    expect(getByTestId('mermaid-renderer').dataset.definition).toBe(definition)
  })
})
