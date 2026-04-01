import { render, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const writeTextMock = vi.fn()
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: writeTextMock },
  writable: true,
})

import { CopyButton } from '@/components/ui/CopyButton'

describe('CopyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    writeTextMock.mockResolvedValue(undefined)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with aria-label "Copy to clipboard" by default', () => {
    const { container } = render(<CopyButton text="hello" />)
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe('Copy to clipboard')
  })

  it('calls navigator.clipboard.writeText with the provided text on click', () => {
    const { container } = render(<CopyButton text="hello world" />)
    fireEvent.click(container.querySelector('button')!)
    expect(writeTextMock).toHaveBeenCalledWith('hello world')
  })

  it('shows aria-label "Copied" immediately after click', async () => {
    const { container } = render(<CopyButton text="hello" />)
    await act(async () => {
      fireEvent.click(container.querySelector('button')!)
    })
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe('Copied')
  })

  it('resets aria-label back to "Copy to clipboard" after 1500ms', async () => {
    const { container } = render(<CopyButton text="hello" />)
    await act(async () => {
      fireEvent.click(container.querySelector('button')!)
    })
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe('Copy to clipboard')
  })

  it('applies className to the button element', () => {
    const { container } = render(<CopyButton text="hello" className="my-class" />)
    expect(container.querySelector('button')!.classList.contains('my-class')).toBe(true)
  })

  it('silently handles clipboard failure', () => {
    writeTextMock.mockRejectedValue(new Error('denied'))
    const { container } = render(<CopyButton text="hello" />)
    expect(() => fireEvent.click(container.querySelector('button')!)).not.toThrow()
  })
})
