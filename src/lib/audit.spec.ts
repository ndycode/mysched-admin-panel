import { describe, expect, it } from 'vitest'

import { sanitizeAuditDetails } from './audit'

describe('sanitizeAuditDetails', () => {
  it('redacts known sensitive keys on objects', () => {
    const payload = {
      password: 'super-secret',
      profile: {
        new_password: 'another-secret',
        name: 'Alice',
      },
    }

    const sanitized = sanitizeAuditDetails(payload)

    expect(sanitized).not.toBe(payload)
    expect(sanitized).toEqual({
      password: '[REDACTED]',
      profile: {
        new_password: '[REDACTED]',
        name: 'Alice',
      },
    })
    expect(payload.profile.new_password).toBe('another-secret')
  })

  it('redacts sensitive keys within arrays', () => {
    const payload = [{ token: 'abc123' }, { api_key: 'xyz' }]
    const sanitized = sanitizeAuditDetails(payload)

    expect(sanitized).toEqual([
      { token: '[REDACTED]' },
      { api_key: '[REDACTED]' },
    ])
  })

  it('returns primitives untouched', () => {
    expect(sanitizeAuditDetails('hello')).toBe('hello')
    expect(sanitizeAuditDetails(null)).toBeNull()
    expect(sanitizeAuditDetails(undefined)).toBeUndefined()
    expect(sanitizeAuditDetails(42)).toBe(42)
  })
})
