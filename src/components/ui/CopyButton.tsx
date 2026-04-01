import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  text: string
  className?: string
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  function handleClick() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {
      // silently no-op
    })
  }

  return (
    <button
      onClick={handleClick}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      className={`${copied ? 'text-(--color-state-success)' : 'text-(--color-text-tertiary) hover:text-(--color-text-secondary)'} ${className ?? ''}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}
