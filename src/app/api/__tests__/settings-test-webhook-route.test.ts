/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as route from '../settings/test-webhook/route'

const mocks = vi.hoisted(() => ({
  throttle: vi.fn(),
  assertSameOrigin: vi.fn(),
  requireAdmin: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  logErr: vi.fn(() => 'logged error'),
}))

vi.mock('@/lib/rate', () => ({ throttle: mocks.throttle }))
vi.mock('@/lib/csrf', () => ({ assertSameOrigin: mocks.assertSameOrigin }))
vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/request', () => ({ getClientIp: mocks.getClientIp }))
vi.mock('@/lib/log', () => ({ logErr: mocks.logErr }))
vi.mock('@/lib/api-error', () => ({ extractStatus: (error: any) => error?.status ?? 500 }))

function makeRequest(body: any = { endpoint: 'https://example.com/hook' }): Request {
  return {
    json: async () => body,
    headers: new Headers({ Origin: 'http://localhost' }),
  } as unknown as Request
}

function mockFetch(response: Partial<Response>) {
  const defaults = {
    ok: true,
    status: 200,
  }
  global.fetch = vi.fn(async () => ({ ...defaults, ...response })) as any
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.throttle.mockResolvedValue(undefined)
  mocks.assertSameOrigin.mockResolvedValue(undefined)
  mocks.requireAdmin.mockResolvedValue({})
  global.fetch = vi.fn()
})

describe('/api/settings/test-webhook', () => {
  it('verifies the webhook endpoint and returns latency', async () => {
    mockFetch({ ok: true, status: 202 })
    const res = await route.POST(makeRequest())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.status).toBe(202)
    expect(typeof data.latencyMs).toBe('number')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/hook',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('returns 502 when webhook responds with an error', async () => {
    mockFetch({ ok: false, status: 500 })
    const res = await route.POST(makeRequest())
    expect(res.status).toBe(502)
    const data = await res.json()
    expect(data.error).toMatch(/status 500/)
  })

  it('rejects unsupported protocols', async () => {
    const res = await route.POST(makeRequest({ endpoint: 'ftp://example.com/hook' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/Only HTTP and HTTPS/)
  })

  it('propagates rate limiting errors', async () => {
    const error = Object.assign(new Error('rate limited'), { status: 429 })
    mocks.throttle.mockRejectedValueOnce(error)
    const res = await route.POST(makeRequest())
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toMatch(/Too many attempts/)
  })

  it('handles timeouts gracefully', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    global.fetch = vi.fn(() => Promise.reject(abortError)) as any
    const res = await route.POST(makeRequest())
    expect(res.status).toBe(504)
    const data = await res.json()
    expect(data.error).toMatch(/did not respond in time/)
  })
})

