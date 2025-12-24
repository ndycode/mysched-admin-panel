import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/rate', () => ({
  throttle: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/request', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/log', () => ({
  logErr: vi.fn((route, error) => `Error in ${route}`),
}))

describe('geo route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handles rate limiting', async () => {
    const { throttle } = await import('@/lib/rate')
    vi.mocked(throttle).mockRejectedValueOnce({ status: 429 })

    const { GET } = await import('@/app/api/geo/route')
    const req = new NextRequest('http://localhost/api/geo')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(429)
    expect(body.error).toContain('Too many requests')
  })

  it('handles throttle errors gracefully', async () => {
    const { throttle } = await import('@/lib/rate')
    vi.mocked(throttle).mockRejectedValueOnce(new Error('Unexpected error'))

    const { GET } = await import('@/app/api/geo/route')
    const req = new NextRequest('http://localhost/api/geo')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.ip).toBe('127.0.0.1')
  })

  it('returns geo data structure', async () => {
    // Mock successful throttle
    const { throttle } = await import('@/lib/rate')
    vi.mocked(throttle).mockResolvedValueOnce(undefined)

    // Mock fetch for geo lookup (will fail but we test structure)
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

    try {
      const { GET } = await import('@/app/api/geo/route')
      const req = new NextRequest('http://localhost/api/geo')
      const res = await GET(req)
      const body = await res.json()

      expect(body).toHaveProperty('ip')
      expect(body).toHaveProperty('city')
      expect(body).toHaveProperty('region')
      expect(body).toHaveProperty('country')
      expect(body).toHaveProperty('secure')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('detects secure requests', async () => {
    const { throttle } = await import('@/lib/rate')
    vi.mocked(throttle).mockResolvedValueOnce(undefined)

    // Mock fetch for geo lookup
    const originalFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ city: 'Test', region: 'Region', country: 'US' }),
    })

    try {
      const { GET } = await import('@/app/api/geo/route')
      const req = new NextRequest('http://localhost/api/geo', {
        headers: { 'x-forwarded-proto': 'https' },
      })
      const res = await GET(req)
      const body = await res.json()

      expect(body.secure).toBe(true)
    } finally {
      global.fetch = originalFetch
    }
  })
})
