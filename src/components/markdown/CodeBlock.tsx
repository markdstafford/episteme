import { Component, type ReactNode } from 'react'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { CodeBlock as CodeBlockBase } from '@tiptap/extension-code-block'
import { ShikiRenderer } from './ShikiRenderer'
import { MermaidRenderer } from './MermaidRenderer'

// Error boundary — last-resort safety net for unexpected renderer failures
class CodeBlockErrorBoundary extends Component<
  { children: ReactNode; code: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; code: string }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <pre>
          <code>{this.props.code}</code>
        </pre>
      )
    }
    return this.props.children
  }
}

interface CodeBlockDispatcherProps {
  node: { attrs: { language: string | null }; textContent: string }
}

export function CodeBlockDispatcher({ node }: CodeBlockDispatcherProps) {
  const language = node.attrs.language ?? ''
  const code = node.textContent

  return (
    <NodeViewWrapper>
      <CodeBlockErrorBoundary code={code}>
        {language === 'mermaid' ? (
          <MermaidRenderer definition={code} />
        ) : (
          <ShikiRenderer code={code} language={language} />
        )}
      </CodeBlockErrorBoundary>
    </NodeViewWrapper>
  )
}

// TipTap extension — extends the base CodeBlock to add our React node view
export const CodeBlock = CodeBlockBase.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockDispatcher)
  },
})
