/**
 * Issue reports route tests
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '@/app/api/issue-reports/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/supabase-service', () => ({
  sbService: vi.fn(),
}))

vi.mock('@/lib/authz', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/csrf', () => ({
  assertSameOrigin: vi.fn(),
}))

vi.mock('@/lib/rate', () => ({
  throttle: vi.fn(),
}))

vi.mock('@/lib/request', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

function createRequest(
  method: string,
  url = 'http://localhost:3000/api/issue-reports',
  body?: unknown
): NextRequest {
  const headers: Record<string, string> = {}
  let reqBody: string | undefined
  
  if (body) {
    reqBody = JSON.stringify(body)
    headers['Content-Type'] = 'application/json'
  }
  
  return new NextRequest(url, {
    method,
    headers,
    body: reqBody,
  })
}

describe('/api/issue-reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    test('returns issue reports successfully', async () => {
      const { sbService } = await import('@/lib/supabase-service')
      const mockReports = [
        {
          id: 1,
          user_id: 'user-1',
          class_id: 100,
          section_id: null,
          note: 'Test issue',
          snapshot: {},
          status: 'new',
          created_at: '2024-01-01T00:00:00Z',
          resolution_note: null,
        },
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockResolvedValue({ data: mockReports, error: null })
      const mockIn = vi.fn().mockResolvedValue({ data: [], error: null })

      ;(sbService as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          order: mockOrder,
          limit: mockLimit,
          in: mockIn,
        }),
      })

      const request = createRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    test('filters by status parameter', async () => {
      const { sbService } = await import('@/lib/supabase-service')
      
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockLimit = vi.fn().mockReturnValue({ eq: mockEq })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      ;(sbService as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
      })

      const request = createRequest('GET', 'http://localhost:3000/api/issue-reports?status=resolved')
      await GET(request)

      expect(mockEq).toHaveBeenCalledWith('status', 'resolved')
    })

    test('respects limit parameter with max of 500', async () => {
      const { sbService } = await import('@/lib/supabase-service')
      
      const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      ;(sbService as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
      })

      // Request more than 500
      const request = createRequest('GET', 'http://localhost:3000/api/issue-reports?limit=1000')
      await GET(request)

      // Should be capped at 500
      expect(mockLimit).toHaveBeenCalledWith(500)
    })

    test('handles database errors', async () => {
      const { sbService } = await import('@/lib/supabase-service')
      
      const mockLimit = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      ;(sbService as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
      })

      const request = createRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('PATCH', () => {
    test('updates issue report status', async () => {
      const { sbService } = await import('@/lib/supabase-service')
      
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })

      ;(sbService as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
        }),
      })

      const request = createRequest('PATCH', 'http://localhost:3000/api/issue-reports', {
        id: 1,
        status: 'resolved',
      })

      const response = await PATCH(request)

      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'resolved' })
    })

    test('rejects invalid id', async () => {
      const request = createRequest('PATCH', 'http://localhost:3000/api/issue-reports', {
        id: 'invalid',
        status: 'resolved',
      })

      const response = await PATCH(request)
      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error).toContain('Invalid id')
    })

    test('rejects negative id', async () => {
      const request = createRequest('PATCH', 'http://localhost:3000/api/issue-reports', {
        id: -1,
        status: 'resolved',
      })

      const response = await PATCH(request)
      expect(response.status).toBe(400)
    })

    test('rejects missing status', async () => {
      const request = createRequest('PATCH', 'http://localhost:3000/api/issue-reports', {
        id: 1,
      })

      const response = await PATCH(request)
      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error).toContain('status')
    })

    test('rejects invalid status value', async () => {
      const request = createRequest('PATCH', 'http://localhost:3000/api/issue-reports', {
        id: 1,
        status: 'invalid_status',
      })

      const response = await PATCH(request)
      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error).toContain('Invalid status')
    })

    test('accepts valid status values', async () => {
      const { sbService } = await import('@/lib/supabase-service')
      
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })

      ;(sbService as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
        }),
      })

      const validStatuses = ['new', 'resolved', 'ignored']
      
      for (const status of validStatuses) {
        const request = createRequest('PATCH', 'http://localhost:3000/api/issue-reports', {
          id: 1,
          status,
        })
        const response = await PATCH(request)
        expect(response.status).toBe(200)
      }
    })

    test('includes resolution_note when provided', async () => {
      const { sbService } = await import('@/lib/supabase-service')
      
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })

      ;(sbService as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
        }),
      })

      const request = createRequest('PATCH', 'http://localhost:3000/api/issue-reports', {
        id: 1,
        status: 'resolved',
        resolution_note: 'Fixed the issue',
      })

      await PATCH(request)

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'resolved',
        resolution_note: 'Fixed the issue',
      })
    })
  })
})
