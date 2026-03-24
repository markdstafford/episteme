import { describe, it, expect, beforeEach, vi } from 'vitest'

// Opt out of the global setup.ts mock so we can test the real singleton behaviour
vi.unmock('@/lib/shikiSingleton')

// Must mock shiki before importing singleton — shiki loads WASM which jsdom can't handle
vi.mock('shiki', () => ({
  createHighlighter: vi.fn().mockResolvedValue({
    codeToHtml: vi.fn(),
    getLoadedLanguages: vi.fn().mockReturnValue([]),
  }),
}))
vi.mock('@catppuccin/vscode/themes/latte.json', () => ({ default: { name: 'Catppuccin Latte' } }))
vi.mock('@catppuccin/vscode/themes/mocha.json', () => ({ default: { name: 'Catppuccin Mocha' } }))

describe('shikiSingleton', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns a promise from getHighlighter', async () => {
    const { getHighlighter } = await import('@/lib/shikiSingleton')
    const result = getHighlighter()
    expect(result).toBeInstanceOf(Promise)
  })

  it('returns the same promise on repeated calls (singleton)', async () => {
    const { getHighlighter } = await import('@/lib/shikiSingleton')
    const first = getHighlighter()
    const second = getHighlighter()
    expect(first).toBe(second)
  })
})
