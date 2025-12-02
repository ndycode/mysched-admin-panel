import { Buffer } from 'node:buffer'
import { describe, expect, it, afterEach, vi } from 'vitest'

import { LOCAL_SUPABASE_DEFAULTS } from './supabase-defaults'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const globalRef = globalThis as typeof globalThis & {
  window?: unknown
  __MYSCHED_PUBLIC_ENV__?: {
    supabaseUrl?: string | null
    supabaseAnonKey?: string | null
  }
}
const ORIGINAL_WINDOW = globalRef.window

async function loadEnvModule() {
  vi.resetModules()
  const globalEnv = globalThis as typeof globalThis & {
    __myschedEnvCache?: unknown
    __myschedEnvDiagnostics?: unknown
  }
  delete globalEnv.__myschedEnvCache
  delete globalEnv.__myschedEnvDiagnostics
  return import('./env')
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  delete process.env.SUPABASE_SERVICE_ROLE
  delete process.env.SUPABASE_ANON_KEY
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_REFERENCE
  delete process.env.SUPABASE_ANON_KEY_B64
  delete process.env.SUPABASE_SERVICE_ROLE_B64
  delete process.env.SUPABASE_LOCAL_URL
  delete process.env.SUPABASE_LOCAL_ANON_KEY
  delete process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
  delete process.env.SUPABASE_PROJECT_ID
  delete process.env.SUPABASE_ALLOW_LOCAL_DEFAULTS
  delete process.env.SUPABASE_DISABLE_LOCAL_DEFAULTS
  delete process.env.VERCEL
  delete process.env.CI
  delete process.env.VERCEL_PROJECT_NAME
  delete process.env.NEXT_PUBLIC_SUPABASE_HAS_SERVICE_ROLE
  delete process.env.NEXT_PUBLIC_SUPABASE_USING_LOCAL_DEFAULTS
  delete process.env.NEXT_PUBLIC_VERCEL
  delete process.env.NEXT_PUBLIC_VERCEL_PROJECT_NAME
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
  if (ORIGINAL_WINDOW === undefined) {
    delete globalRef.window
  } else {
    globalRef.window = ORIGINAL_WINDOW
  }
  delete globalRef.__MYSCHED_PUBLIC_ENV__
})

describe('environment alias resolution', () => {
  it('derives Supabase URL from project reference', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ''
    process.env.SUPABASE_URL = ''
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''
    process.env.NEXT_PUBLIC_SUPABASE_REFERENCE = 'demo-ref'
    process.env.SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'

    const envModule = await loadEnvModule()
    const config = envModule.getSupabaseBrowserConfig()

    expect(config.url).toBe('https://demo-ref.supabase.co')
    expect(config.anon).toBe('anon-key')
  })

  it('accepts base64 encoded anon key', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_ANON_KEY_B64 = Buffer.from('encoded-anon', 'utf8').toString('base64')
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'

    const envModule = await loadEnvModule()
    const config = envModule.getSupabaseBrowserConfig()

    expect(config.anon).toBe('encoded-anon')
  })

  it('accepts base64 encoded service role', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE_B64 = Buffer.from('service-role', 'utf8').toString('base64')

    const envModule = await loadEnvModule()
    const config = envModule.getSupabaseConfig()

    expect(config.serviceRole).toBe('service-role')
  })

  it('normalizes Supabase URL protocol and origin', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      'http://bukkyqntgathvejriayz.supabase.co/auth/v1'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE = 'service-role'

    const envModule = await loadEnvModule()
    const config = envModule.getSupabaseBrowserConfig()

    expect(config.url).toBe('https://bukkyqntgathvejriayz.supabase.co')
  })

  it('honours runtime window overrides in the browser bundle', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const envModule = await loadEnvModule()

    globalRef.__MYSCHED_PUBLIC_ENV__ = {
      supabaseUrl: 'https://runtime.supabase.co',
      supabaseAnonKey: 'runtime-anon',
    }

    const config = envModule.getSupabaseBrowserConfig()

    expect(config.url).toBe('https://runtime.supabase.co')
    expect(config.anon).toBe('runtime-anon')
  })
})

describe('local Supabase defaults', () => {
  it('fills missing service role when allowed', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    const envModule = await loadEnvModule()
    const config = envModule.getSupabaseConfig()

    expect(config.serviceRole).toBe(LOCAL_SUPABASE_DEFAULTS.serviceRoleKey)
  })

  it('does not use defaults in production without opt-in', async () => {
    process.env.NODE_ENV = 'production'

    const envModule = await loadEnvModule()

    expect(() => envModule.getSupabaseBrowserConfig()).toThrow(
      /Supabase public credentials are not configured/,
    )
  })

  it('refuses defaults in production even when opt-in is set', async () => {
    process.env.NODE_ENV = 'production'
    process.env.SUPABASE_ALLOW_LOCAL_DEFAULTS = '1'

    const envModule = await loadEnvModule()
    expect(() => envModule.getSupabaseConfig()).toThrow(
      /Supabase public credentials are not configured/,
    )
  })

  it('honours custom local URL overrides when provided', async () => {
    process.env.SUPABASE_LOCAL_URL = 'host.docker.internal:6543'

    const envModule = await loadEnvModule()
    const config = envModule.getSupabaseConfig()

    expect(config.url).toBe('http://host.docker.internal:6543')
  })

  it('ignores the production opt-in flag on managed CI platforms', async () => {
    process.env.NODE_ENV = 'production'
    process.env.SUPABASE_ALLOW_LOCAL_DEFAULTS = '1'
    process.env.CI = '1'

    const envModule = await loadEnvModule()

    expect(() => envModule.getSupabaseBrowserConfig()).toThrow(
      /Supabase public credentials are not configured/,
    )
  })
})

describe('Supabase browser status', () => {
  it('reports missing browser credentials when no variables are set', async () => {
    process.env.SUPABASE_DISABLE_LOCAL_DEFAULTS = '1'

    const envModule = await loadEnvModule()
    const status = envModule.getSupabaseBrowserStatus()

    expect(status.configured).toBe(false)
    expect(status.missingPublicKeys).toEqual([
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ])
    expect(status.usingLocalFallback).toBe(false)
    expect(status.serviceRoleConfigured).toBe(false)
    expect(status.runningOnVercel).toBe(false)
    expect(status.vercelProjectName).toBeNull()
  })

  it('flags when local development defaults are being used', async () => {
    const envModule = await loadEnvModule()
    const status = envModule.getSupabaseBrowserStatus()

    expect(status.configured).toBe(false)
    expect(status.usingLocalFallback).toBe(true)
    expect(status.runningOnVercel).toBe(false)
  })

  it('marks the browser credentials as configured when supplied', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE = 'service-role'
    process.env.VERCEL = '1'
    process.env.VERCEL_PROJECT_NAME = 'mysched-app'
    process.env.NEXT_PUBLIC_SUPABASE_HAS_SERVICE_ROLE = '1'
    process.env.NEXT_PUBLIC_VERCEL = '1'
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_NAME = 'mysched-app'

    const envModule = await loadEnvModule()
    const status = envModule.getSupabaseBrowserStatus()

    expect(status.configured).toBe(true)
    expect(status.missingPublicKeys).toEqual([])
    expect(status.usingLocalFallback).toBe(false)
    expect(status.serviceRoleConfigured).toBe(true)
    expect(status.runningOnVercel).toBe(true)
    expect(status.vercelProjectName).toBe('mysched-app')
  })
})
