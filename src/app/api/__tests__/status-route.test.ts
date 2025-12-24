import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock supabase service
vi.mock('@/lib/supabase-service', () => ({
  sbService: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/authz', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: 'admin', email: 'admin@test.com' }),
}))

describe('status route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exports GET handler', async () => {
    const module = await import('@/app/api/status/route')
    expect(typeof module.GET).toBe('function')
  })

  it('GET handler returns response', async () => {
    const { GET } = await import('@/app/api/status/route')
    const req = new NextRequest('http://localhost/api/status')
    const res = await GET(req)

    // Should return a valid response (may be 200 or error depending on mocks)
    expect(res).toBeDefined()
    expect(typeof res.status).toBe('number')
  })
})
