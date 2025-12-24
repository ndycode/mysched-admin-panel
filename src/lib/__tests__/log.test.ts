/**
 * Log utilities tests
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { logErr } from '../log'

describe('logErr', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('extracts message from Error object', () => {
    const error = new Error('Something went wrong')
    const result = logErr('/api/test', error)
    expect(result).toBe('Something went wrong')
  })

  test('converts non-Error values to string', () => {
    expect(logErr('/api/test', 'string error')).toBe('string error')
    expect(logErr('/api/test', 123)).toBe('123')
    expect(logErr('/api/test', null)).toBe('null')
    expect(logErr('/api/test', undefined)).toBe('undefined')
  })

  test('handles object without message', () => {
    const result = logErr('/api/test', { code: 'ERR_001' })
    expect(result).toBe('[object Object]')
  })

  // Note: In test environment, logErr doesn't console.error
  // So we can only test the return values here

  test('returns correct message regardless of error type', () => {
    const err1 = new Error('Error message')
    expect(logErr('/api/route1', err1)).toBe('Error message')

    const err2 = 'Plain string'
    expect(logErr('/api/route2', err2)).toBe('Plain string')

    const err3 = { custom: 'object' }
    expect(logErr('/api/route3', err3)).toBe('[object Object]')
  })

  test('handles empty extra parameter', () => {
    const result = logErr('/api/test', new Error('test'), {})
    expect(result).toBe('test')
  })

  test('handles extra parameter with values', () => {
    const result = logErr('/api/test', new Error('test'), { userId: '123', requestId: 'abc' })
    expect(result).toBe('test')
  })
})
