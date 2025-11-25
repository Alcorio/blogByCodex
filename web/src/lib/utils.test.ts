import { describe, expect, it } from 'vitest'
import { estimateReadingMinutes, formatDate, slugify } from './utils'

describe('slugify', () => {
  it('creates url friendly string', () => {
    expect(slugify('Hello World 123')).toBe('hello-world-123')
    expect(slugify('  Extra  -- spaces ')).toBe('extra-spaces')
  })
})

describe('estimateReadingMinutes', () => {
  it('returns at least one minute', () => {
    expect(estimateReadingMinutes('word')).toBe(1)
  })
})

describe('formatDate', () => {
  it('formats iso string', () => {
    expect(formatDate('2025-01-01T00:00:00.000Z')).toContain('2025')
  })
})
