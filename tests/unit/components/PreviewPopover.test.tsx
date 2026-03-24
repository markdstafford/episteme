import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

import { invoke } from '@tauri-apps/api/core'
import { PreviewPopover } from '@/components/PreviewPopover'

describe('PreviewPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: load_preferences returns defaults, read_file returns empty
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === 'load_preferences') return Promise.resolve({ preview_width: '400px', preview_height: '480px' })
      if (cmd === 'read_file') return Promise.resolve('# Hello')
      return Promise.resolve(null)
    })
  })

  it('does not call read_file when closed', () => {
    render(
      <PreviewPopover
        open={false}
        onOpenChange={vi.fn()}
        path="/docs/test.md"
        workspacePath="/docs"
        onMouseEnter={vi.fn()}
        onMouseLeave={vi.fn()}
      />
    )
    expect(invoke).not.toHaveBeenCalledWith('read_file', expect.anything())
  })

  it('calls read_file with the correct path when opened', async () => {
    render(
      <PreviewPopover
        open={true}
        onOpenChange={vi.fn()}
        path="/docs/test.md"
        workspacePath="/docs"
        onMouseEnter={vi.fn()}
        onMouseLeave={vi.fn()}
      />
    )
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('read_file', expect.objectContaining({
        filePath: '/docs/test.md',
        workspacePath: '/docs',
      }))
    })
  })
})
