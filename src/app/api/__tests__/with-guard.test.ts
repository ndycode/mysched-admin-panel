/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

import { withGuard } from '@/lib/with-guard'

const mocks = vi.hoisted(() => ({
  assertSameOrigin: vi.fn(),
  throttle: vi.fn(),
  requireAdmin: vi.fn(async () => ({ id: 'admin-1', email: 'a@example.com' })),
  audit: vi.fn(),
  auditError: vi.fn(),
  logErr: vi.fn(() => 'logged'),
}))

vi.mock('@/lib/csrf', () => ({ assertSameOrigin: mocks.assertSameOrigin }))
vi.mock('@/lib/rate', () => ({ throttle: mocks.throttle }))
vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/audit', () => ({ audit: mocks.audit, auditError: mocks.auditError }))
vi.mock('@/lib/log', () => ({ logErr: mocks.logErr }))

describe('withGuard', () => {
  const makeReq = () =>
    ({
      nextUrl: { pathname: '/api/test' },
      method: 'GET',
      headers: new Headers(),
    }) as any

  it('runs the handler and applies headers on success', async () => {
    const handler = withGuard({}, async (_req, _ctx, helpers) => {
      expect(helpers.admin.id).toBe('admin-1')
      return helpers.json({ ok: true })
    })

    const res = await handler(makeReq(), { params: {} })
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Referrer-Policy')).toBe('same-origin')
  })

  it('rejects when origin fails', async () => {
    mocks.assertSameOrigin.mockImplementationOnce(() => {
      throw Object.assign(new Error('bad origin'), { status: 403, code: 'forbidden_origin' })
    })

    const handler = withGuard({ origin: true }, async () => NextResponse.json({ ok: true }))
    const res = await handler(makeReq(), { params: {} })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('forbidden_origin')
  })

  it('audits server errors when enabled', async () => {
    mocks.auditError.mockClear()

    const handler = withGuard(
      { audit: true },
      async () => {
        throw Object.assign(new Error('boom'), { status: 500, code: 'boom' })
      },
    )

    const res = await handler(makeReq(), { params: {} })
    expect(res.status).toBe(500)
    expect(mocks.auditError).toHaveBeenCalledWith('admin-1', 'system', 'boom', undefined)
  })

  it('applies rate limiting when configured', async () => {
    const handler = withGuard({ rate: { windowSec: 1, limit: 2 } }, async () =>
      NextResponse.json({ ok: true }),
    )
    await handler(makeReq(), { params: {} })
    expect(mocks.throttle).toHaveBeenCalled()
  })
})

