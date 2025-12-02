import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as route from '../admins/grant-self/route'

const mocks = vi.hoisted(() => ({
  sbServer: vi.fn(),
  sbService: vi.fn(),
  audit: vi.fn(),
  auditError: vi.fn(),
  logErr: vi.fn(() => 'logged error'),
}))

vi.mock('@/lib/supabase-server', () => ({ sbServer: mocks.sbServer }))
vi.mock('@/lib/supabase-service', () => ({ sbService: mocks.sbService }))
vi.mock('@/lib/audit', () => ({ audit: mocks.audit, auditError: mocks.auditError }))
vi.mock('@/lib/log', () => ({ logErr: mocks.logErr }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.sbServer.mockResolvedValue({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    },
  })
  mocks.sbService.mockReturnValue({
    from: vi.fn(() => ({
      upsert: vi.fn(async () => ({ error: null })),
    })),
  })
  vi.stubEnv('NODE_ENV', 'development')
})

describe('/api/admins/grant-self', () => {
  it('upserts the current user as an admin in development', async () => {
    const res = await route.POST()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.bootstrap).toBe(true)
    expect(mocks.audit).toHaveBeenCalledWith('user-1', 'admins', 'insert', 'user-1', expect.any(Object))
  })

  it('returns 403 in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const res = await route.POST()
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('Forbidden')
  })

  it('handles upsert errors', async () => {
    mocks.sbService.mockReturnValue({
      from: vi.fn(() => ({
        upsert: vi.fn(async () => ({ error: { message: 'duplicate' } })),
      })),
    })
    const res = await route.POST()
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('duplicate')
  })
})
