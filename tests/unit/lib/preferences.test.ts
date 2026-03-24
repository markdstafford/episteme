import { describe, it, expect } from 'vitest'
import { parsePreferences, DEFAULT_PREFERENCES } from '@/lib/preferences'

describe('parsePreferences', () => {
  it('returns default preview_width when field is missing', () => {
    const result = parsePreferences({})
    expect(result.preview_width).toBe('50%')
  })

  it('returns default preview_height when field is missing', () => {
    const result = parsePreferences({})
    expect(result.preview_height).toBe('75%')
  })

  it('preserves a valid % value for preview_width', () => {
    const result = parsePreferences({ last_opened_folder: null, aws_profile: null, preview_width: '60%' })
    expect(result.preview_width).toBe('60%')
  })

  it('falls back to default for an invalid px value', () => {
    const result = parsePreferences({ last_opened_folder: null, aws_profile: null, preview_width: '600px' })
    expect(result.preview_width).toBe('50%')
  })

  it('DEFAULT_PREFERENCES includes preview_width and preview_height', () => {
    expect(DEFAULT_PREFERENCES.preview_width).toBe('50%')
    expect(DEFAULT_PREFERENCES.preview_height).toBe('75%')
  })
})
