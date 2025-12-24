import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the dependencies
vi.mock('@/lib/supabase-server', () => ({
  sbServer: vi.fn(),
}))

vi.mock('@/lib/supabase-service', () => ({
  sbService: vi.fn(),
}))

describe('is-admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null user and false isAdmin when auth fails', async () => {
    const { sbServer } = await import('@/lib/supabase-server')
    vi.mocked(sbServer).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ 
          data: null, 
          error: new Error('Auth error') 
        }),
      },
    } as any)

    const { getUserAndAdmin } = await import('@/lib/is-admin')
    const result = await getUserAndAdmin()

    expect(result.user).toBeNull()
    expect(result.isAdmin).toBe(false)
  })

  it('returns null user and false isAdmin when no user in session', async () => {
    const { sbServer } = await import('@/lib/supabase-server')
    vi.mocked(sbServer).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ 
          data: { user: null }, 
          error: null 
        }),
      },
    } as any)

    const { getUserAndAdmin } = await import('@/lib/is-admin')
    const result = await getUserAndAdmin()

    expect(result.user).toBeNull()
    expect(result.isAdmin).toBe(false)
  })

  it('returns user and true isAdmin when user is in admins table', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'admin@test.com',
      app_metadata: {},
      user_metadata: {},
    }

    const { sbServer } = await import('@/lib/supabase-server')
    vi.mocked(sbServer).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ 
          data: { user: mockUser }, 
          error: null 
        }),
      },
    } as any)

    const { sbService } = await import('@/lib/supabase-service')
    vi.mocked(sbService).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ 
              data: { user_id: 'user-123' }, 
              error: null 
            }),
          }),
        }),
      }),
    } as any)

    const { getUserAndAdmin } = await import('@/lib/is-admin')
    const result = await getUserAndAdmin()

    expect(result.user).toEqual(mockUser)
    expect(result.isAdmin).toBe(true)
  })

  it('returns user and false isAdmin when user is not in admins table', async () => {
    const mockUser = {
      id: 'user-456',
      email: 'regular@test.com',
    }

    const { sbServer } = await import('@/lib/supabase-server')
    vi.mocked(sbServer).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ 
          data: { user: mockUser }, 
          error: null 
        }),
      },
    } as any)

    const { sbService } = await import('@/lib/supabase-service')
    vi.mocked(sbService).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ 
              data: null, 
              error: null 
            }),
          }),
        }),
      }),
    } as any)

    const { getUserAndAdmin } = await import('@/lib/is-admin')
    const result = await getUserAndAdmin()

    expect(result.user).toEqual(mockUser)
    expect(result.isAdmin).toBe(false)
  })

  it('returns user and false isAdmin when admins query errors', async () => {
    const mockUser = {
      id: 'user-789',
      email: 'test@test.com',
    }

    const { sbServer } = await import('@/lib/supabase-server')
    vi.mocked(sbServer).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ 
          data: { user: mockUser }, 
          error: null 
        }),
      },
    } as any)

    const { sbService } = await import('@/lib/supabase-service')
    vi.mocked(sbService).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ 
              data: { user_id: 'user-789' }, 
              error: new Error('DB error') 
            }),
          }),
        }),
      }),
    } as any)

    const { getUserAndAdmin } = await import('@/lib/is-admin')
    const result = await getUserAndAdmin()

    expect(result.user).toEqual(mockUser)
    expect(result.isAdmin).toBe(false)
  })
})
