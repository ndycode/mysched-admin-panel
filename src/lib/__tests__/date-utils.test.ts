/**
 * Date utilities tests
 */
import { describe, test, expect } from 'vitest'
import { formatDate, formatDateTime } from '../date-utils'

describe('formatDate', () => {
  test('formats valid ISO date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z')
    // Result depends on locale but should contain the date components
    expect(result).not.toBe('-')
    expect(result).toMatch(/2024|Jan|15/)
  })

  test('returns dash for null', () => {
    expect(formatDate(null)).toBe('-')
  })

  test('returns dash for empty string', () => {
    expect(formatDate('')).toBe('-')
  })

  test('returns dash for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('-')
    expect(formatDate('invalid')).toBe('-')
  })

  test('handles date-only strings', () => {
    const result = formatDate('2024-06-20')
    expect(result).not.toBe('-')
  })
})

describe('formatDateTime', () => {
  test('formats valid ISO datetime string', () => {
    const result = formatDateTime('2024-01-15T10:30:00Z')
    expect(result).not.toBe('-')
    // Should contain date and time components
    expect(result).toMatch(/2024|Jan|15/)
  })

  test('returns dash for null', () => {
    expect(formatDateTime(null)).toBe('-')
  })

  test('returns dash for empty string', () => {
    expect(formatDateTime('')).toBe('-')
  })

  test('returns dash for invalid date string', () => {
    expect(formatDateTime('invalid-datetime')).toBe('-')
  })

  test('handles various ISO formats', () => {
    expect(formatDateTime('2024-12-25T00:00:00.000Z')).not.toBe('-')
    expect(formatDateTime('2024-03-01T23:59:59Z')).not.toBe('-')
  })
})
