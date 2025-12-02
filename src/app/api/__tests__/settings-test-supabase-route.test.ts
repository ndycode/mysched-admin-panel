/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as route from '../settings/test-supabase/route'

const mocks = vi.hoisted(() => ({
  throttle: vi.fn(),
  assertSameOrigin: vi.fn(),
  requireAdmin: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  logErr: vi.fn(() => 'logged error'),
  sbService: vi.fn(),
}))

vi.mock('@/lib/rate', () => ({ throttle: mocks.throttle }))
vi.mock('@/lib/csrf', () => ({ assertSameOrigin: mocks.assertSameOrigin }))
vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/request', () => ({ getClientIp: mocks.getClientIp }))
vi.mock('@/lib/log', () => ({ logErr: mocks.logErr }))
vi.mock('@/lib/api-error', () => ({ extractStatus: (error: any) => error?.status ?? 500 }))
vi.mock('@/lib/http-error', () => ({ createHttpError: (status: number, message: string, cause?: unknown) => ({ status, message, cause }) }))
vi.mock('@/lib/supabase-service', () => ({ sbService: mocks.sbService }))

function makeRequest(): Request {
  return {
    json: async () => ({}),
    headers: new Headers(),
  } as unknown as Request
}

function installSupabaseSuccess() {
  const limit = vi.fn(async () => ({ data: [], error: null }))
  const select = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ select }))
  mocks.sbService.mockReturnValue({ from })
  return { from, select, limit }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.sbService.mockReset()
  mocks.requireAdmin.mockResolvedValue({})
  mocks.assertSameOrigin.mockResolvedValue(undefined)
  mocks.throttle.mockResolvedValue(undefined)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE', 'service-role')
})

describe('/api/settings/test-supabase', () => {
  it('returns latency when the check succeeds', async () => {
    installSupabaseSuccess()
    const res = await route.POST(makeRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(typeof data.latencyMs).toBe('number')
  })

  it('returns 503 when credentials missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const res = await route.POST(makeRequest())
    expect(res.status).toBe(503)
    const data = await res.json()
    expect(data.error).toMatch(/Supabase credentials/)
  })

  it('maps service errors to 500', async () => {
    const limit = vi.fn(async () => ({ error: { message: 'nope' } }))
    const select = vi.fn(() => ({ limit }))
    const from = vi.fn(() => ({ select }))
    mocks.sbService.mockReturnValue({ from })

    const res = await route.POST(makeRequest())
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('logged error')
  })
})

