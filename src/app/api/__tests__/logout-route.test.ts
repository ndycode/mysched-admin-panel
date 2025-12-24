/**
 * Logout route tests
 */
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/logout/route'

// Mock supabase-server
vi.mock('@/lib/supabase-server', () => ({
  sbServer: vi.fn(),
}))

// Mock logging and audit
vi.mock('@/lib/log', () => ({
  logErr: vi.fn((prefix, err) => err?.message ?? 'Unknown error'),
}))

vi.mock('@/lib/audit', () => ({
  auditError: vi.fn(),
}))

describe('/api/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('POST signs out and redirects to /login', async () => {
    const { sbServer } = await import('@/lib/supabase-server')
    const mockSignOut = vi.fn().mockResolvedValue({})
    ;(sbServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { signOut: mockSignOut },
    })

    const request = new Request('http://localhost:3000/api/logout', {
      method: 'POST',
    })

    const response = await POST(request)

    expect(mockSignOut).toHaveBeenCalled()
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/login')
  })

  test('POST sets security headers', async () => {
    const { sbServer } = await import('@/lib/supabase-server')
    ;(sbServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { signOut: vi.fn().mockResolvedValue({}) },
    })

    const request = new Request('http://localhost:3000/api/logout', {
      method: 'POST',
    })

    const response = await POST(request)

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Referrer-Policy')).toBe('same-origin')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  test('POST handles signOut error', async () => {
    const { sbServer } = await import('@/lib/supabase-server')
    ;(sbServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { signOut: vi.fn().mockRejectedValue(new Error('Sign out failed')) },
    })

    const { auditError } = await import('@/lib/audit')

    const request = new Request('http://localhost:3000/api/logout', {
      method: 'POST',
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    expect(auditError).toHaveBeenCalled()
    
    const body = await response.json()
    expect(body.error).toBeDefined()
  })
})
