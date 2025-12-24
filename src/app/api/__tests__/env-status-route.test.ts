import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/env', () => ({
  getSupabaseEnvSnapshot: vi.fn(() => ({
    diagnostics: {
      missing: {
        supabaseUrl: false,
        supabaseAnonKey: false,
        supabaseServiceRole: false,
      },
      usingLocalDefaults: {
        supabaseUrl: false,
        supabaseAnonKey: false,
        supabaseServiceRole: false,
      },
    },
  })),
  SupabaseConfigError: class extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'SupabaseConfigError'
    }
  },
}))

describe('env-status route', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('returns success status when configured', async () => {
    const { GET } = await import('@/app/api/env-status/route')
    const res = await GET()
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.status).toBeDefined()
    expect(body.status.configured).toBe(true)
  })

  it('detects missing public keys', async () => {
    const { getSupabaseEnvSnapshot } = await import('@/lib/env')
    vi.mocked(getSupabaseEnvSnapshot).mockReturnValueOnce({
      diagnostics: {
        missing: {
          supabaseUrl: true,
          supabaseAnonKey: true,
          supabaseServiceRole: false,
        },
        usingLocalDefaults: {
          supabaseUrl: false,
          supabaseAnonKey: false,
          supabaseServiceRole: false,
        },
      },
    } as ReturnType<typeof getSupabaseEnvSnapshot>)

    const { GET } = await import('@/app/api/env-status/route')
    const res = await GET()
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.status.configured).toBe(false)
    expect(body.status.missingPublicKeys).toContain('NEXT_PUBLIC_SUPABASE_URL')
    expect(body.status.missingPublicKeys).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  })

  it('detects local fallback usage', async () => {
    const { getSupabaseEnvSnapshot } = await import('@/lib/env')
    vi.mocked(getSupabaseEnvSnapshot).mockReturnValueOnce({
      diagnostics: {
        missing: {
          supabaseUrl: false,
          supabaseAnonKey: false,
          supabaseServiceRole: false,
        },
        usingLocalDefaults: {
          supabaseUrl: true,
          supabaseAnonKey: true,
          supabaseServiceRole: false,
        },
      },
    } as ReturnType<typeof getSupabaseEnvSnapshot>)

    const { GET } = await import('@/app/api/env-status/route')
    const res = await GET()
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.status.usingLocalFallback).toBe(true)
    expect(body.status.configured).toBe(false)
  })

  it('reports Vercel environment', async () => {
    process.env.VERCEL = '1'
    process.env.VERCEL_PROJECT_NAME = 'my-project'

    vi.resetModules()
    const { GET } = await import('@/app/api/env-status/route')
    const res = await GET()
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.status.runningOnVercel).toBe(true)
    expect(body.status.vercelProjectName).toBe('my-project')
  })

  it('handles errors gracefully', async () => {
    const { getSupabaseEnvSnapshot, SupabaseConfigError } = await import('@/lib/env')
    vi.mocked(getSupabaseEnvSnapshot).mockImplementationOnce(() => {
      throw new SupabaseConfigError('Config error')
    })

    const { GET } = await import('@/app/api/env-status/route')
    const res = await GET()
    const body = await res.json()

    expect(body.ok).toBe(false)
    expect(body.error).toBeDefined()
  })
})
