/**
 * CSRF protection tests
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { assertSameOrigin } from '../csrf'

// Mock the env module
vi.mock('../env', () => ({
  getSiteAllowList: vi.fn(() => ['allowed.com', 'trusted.example.com']),
}))

function createMockRequest(options: {
  url?: string
  method?: string
  origin?: string | null
  referer?: string | null
}): Request {
  const url = options.url ?? 'https://example.com/api/test'
  const headers = new Headers()
  
  if (options.origin !== undefined && options.origin !== null) {
    headers.set('origin', options.origin)
  }
  if (options.referer !== undefined && options.referer !== null) {
    headers.set('referer', options.referer)
  }
  
  return new Request(url, {
    method: options.method ?? 'GET',
    headers,
  })
}

describe('assertSameOrigin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET requests (safe methods)', () => {
    test('allows GET without origin or referer headers', () => {
      const req = createMockRequest({ method: 'GET' })
      expect(() => assertSameOrigin(req)).not.toThrow()
    })

    test('allows GET with matching origin header', () => {
      const req = createMockRequest({
        method: 'GET',
        url: 'https://example.com/api/test',
        origin: 'https://example.com',
      })
      expect(() => assertSameOrigin(req)).not.toThrow()
    })

    test('allows GET with matching referer header', () => {
      const req = createMockRequest({
        method: 'GET',
        url: 'https://example.com/api/test',
        referer: 'https://example.com/page',
      })
      expect(() => assertSameOrigin(req)).not.toThrow()
    })

    test('allows GET with allowed origin from allowlist', () => {
      const req = createMockRequest({
        method: 'GET',
        url: 'https://example.com/api/test',
        origin: 'https://allowed.com',
      })
      expect(() => assertSameOrigin(req)).not.toThrow()
    })

    test('rejects GET with non-matching origin', () => {
      const req = createMockRequest({
        method: 'GET',
        url: 'https://example.com/api/test',
        origin: 'https://malicious.com',
      })
      expect(() => assertSameOrigin(req)).toThrow()
    })
  })

  describe('POST requests (mutating methods)', () => {
    test('rejects POST without origin or referer headers', () => {
      const req = createMockRequest({ method: 'POST' })
      expect(() => assertSameOrigin(req)).toThrow()
    })

    test('allows POST with matching origin header', () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'https://example.com/api/test',
        origin: 'https://example.com',
      })
      expect(() => assertSameOrigin(req)).not.toThrow()
    })

    test('allows POST with matching referer header', () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'https://example.com/api/test',
        referer: 'https://example.com/page',
      })
      expect(() => assertSameOrigin(req)).not.toThrow()
    })

    test('allows POST from allowlisted origin', () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'https://example.com/api/test',
        origin: 'https://trusted.example.com',
      })
      expect(() => assertSameOrigin(req)).not.toThrow()
    })

    test('rejects POST with non-matching origin', () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'https://example.com/api/test',
        origin: 'https://evil.com',
      })
      expect(() => assertSameOrigin(req)).toThrow()
    })
  })

  describe('other mutating methods', () => {
    test('rejects PUT without headers', () => {
      const req = createMockRequest({ method: 'PUT' })
      expect(() => assertSameOrigin(req)).toThrow()
    })

    test('rejects PATCH without headers', () => {
      const req = createMockRequest({ method: 'PATCH' })
      expect(() => assertSameOrigin(req)).toThrow()
    })

    test('rejects DELETE without headers', () => {
      const req = createMockRequest({ method: 'DELETE' })
      expect(() => assertSameOrigin(req)).toThrow()
    })

    test('allows DELETE with matching origin', () => {
      const req = createMockRequest({
        method: 'DELETE',
        url: 'https://example.com/api/test',
        origin: 'https://example.com',
      })
      expect(() => assertSameOrigin(req)).not.toThrow()
    })
  })

  describe('case insensitivity', () => {
    test('handles uppercase host matching', () => {
      const req = createMockRequest({
        method: 'POST',
        url: 'https://EXAMPLE.COM/api/test',
        origin: 'https://example.com',
      })
      expect(() => assertSameOrigin(req)).not.toThrow()
    })
  })
})
