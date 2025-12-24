import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock next/headers cookies
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn(() => []),
  set: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}))

// Mock the env module with the correct path
vi.mock('@/lib/env', () => ({
  getSupabaseBrowserConfig: vi.fn(() => ({
    url: 'https://test.supabase.co',
    anon: 'test-anon-key',
  })),
}))

// Mock supabase ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((url, key, options) => ({
    supabaseUrl: url,
    supabaseKey: key,
    cookies: options.cookies,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}))

describe('supabase-server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates server client with correct config', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    const { sbServer } = await import('../supabase-server')
    
    const client = await sbServer()

    expect(createServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.any(Object),
      })
    )
    expect(client).toBeDefined()
  })

  it('cookie adapter get method works', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'test-cookie-value' })
    
    const { createServerClient } = await import('@supabase/ssr')
    const { sbServer } = await import('../supabase-server')
    
    await sbServer()

    // Get the cookies adapter passed to createServerClient
    const call = vi.mocked(createServerClient).mock.calls[0]
    const cookieAdapter = call[2].cookies as any

    const result = cookieAdapter.get('test-cookie')
    expect(result).toBe('test-cookie-value')
  })

  it('cookie adapter get returns undefined for missing cookie', async () => {
    mockCookieStore.get.mockReturnValue(undefined)
    
    const { createServerClient } = await import('@supabase/ssr')
    const { sbServer } = await import('../supabase-server')
    
    await sbServer()

    const call = vi.mocked(createServerClient).mock.calls[0]
    const cookieAdapter = call[2].cookies as any

    const result = cookieAdapter.get('missing-cookie')
    expect(result).toBeUndefined()
  })

  it('cookie adapter getAll method works', async () => {
    mockCookieStore.getAll.mockReturnValue([
      { name: 'cookie1', value: 'value1' },
      { name: 'cookie2', value: 'value2' },
    ] as any)
    
    const { createServerClient } = await import('@supabase/ssr')
    const { sbServer } = await import('../supabase-server')
    
    await sbServer()

    const call = vi.mocked(createServerClient).mock.calls[0]
    const cookieAdapter = call[2].cookies as any

    const result = cookieAdapter.getAll()
    expect(result).toEqual([
      { name: 'cookie1', value: 'value1' },
      { name: 'cookie2', value: 'value2' },
    ])
  })

  it('cookie adapter set method handles errors silently', async () => {
    mockCookieStore.set.mockImplementation(() => {
      throw new Error('Cannot mutate cookies in Server Component')
    })
    
    const { createServerClient } = await import('@supabase/ssr')
    const { sbServer } = await import('../supabase-server')
    
    await sbServer()

    const call = vi.mocked(createServerClient).mock.calls[0]
    const cookieAdapter = call[2].cookies as any

    // Should not throw
    expect(() => {
      cookieAdapter.set('cookie', 'value', { maxAge: 3600 })
    }).not.toThrow()
  })

  it('cookie adapter remove method handles errors silently', async () => {
    mockCookieStore.set.mockImplementation(() => {
      throw new Error('Cannot mutate cookies in Server Component')
    })
    
    const { createServerClient } = await import('@supabase/ssr')
    const { sbServer } = await import('../supabase-server')
    
    await sbServer()

    const call = vi.mocked(createServerClient).mock.calls[0]
    const cookieAdapter = call[2].cookies as any

    // Should not throw
    expect(() => {
      cookieAdapter.remove('cookie', {})
    }).not.toThrow()
  })
})
