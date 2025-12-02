import { describe, expect, it, vi } from 'vitest'

const authClientMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
}))

const serviceFromMock = vi.hoisted(() => vi.fn())
const cookieStore = vi.hoisted(() => ({
  get: vi.fn(() => null),
  set: vi.fn(),
  getAll: vi.fn(() => []),
}))
const cookiesMock = vi.hoisted(() => vi.fn(() => cookieStore))

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => authClientMock),
}))

vi.mock('@/lib/supabase-service', () => ({
  sbService: vi.fn(() => ({
    from: serviceFromMock,
  })),
}))

vi.mock('@/lib/env', () => ({
  getSupabaseBrowserConfig: () => ({
    url: 'https://example.supabase.co',
    anon: 'anon-key',
  }),
}))

import { requireAdmin } from '../authz'

describe('requireAdmin', () => {
  beforeEach(() => {
    cookieStore.get.mockReset()
    cookieStore.set.mockReset()
    cookieStore.getAll.mockReset()
    cookieStore.get.mockReturnValue(null)
    cookieStore.getAll.mockReturnValue([])
    cookiesMock.mockReset()
    cookiesMock.mockReturnValue(cookieStore)
    authClientMock.auth.getUser.mockReset()
    serviceFromMock.mockReset()
  })

  it('returns the admin user when present', async () => {
    authClientMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@example.com' } },
      error: null,
    })

    serviceFromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { user_id: 'u1' }, error: null }),
        }),
      }),
    })

    const admin = await requireAdmin()
    expect(admin.id).toBe('u1')
    expect(admin.email).toBe('a@example.com')
  })

  it('throws 401 when not authenticated', async () => {
    authClientMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'no user' },
    })

    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 })
  })

  it('throws 401 when cookies cannot be read', async () => {
    cookiesMock.mockImplementationOnce(() => {
      throw new Error('outside request scope')
    })

    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 })
  })

  it('throws 403 when user is not an admin', async () => {
    authClientMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u2' } },
      error: null,
    })

    serviceFromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    })

    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 })
  })
})
