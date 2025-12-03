// src/lib/supabase-defaults.ts

const DEFAULT_LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321'

type LocalSupabaseDefaults = Readonly<{
  url: string
  anonKey: string
  serviceRoleKey: string
}>

export const LOCAL_SUPABASE_DEFAULTS: LocalSupabaseDefaults = {
  url: DEFAULT_LOCAL_SUPABASE_URL,
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDc3NDYyMjk4LCJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6ImFub24ifQ.eg5wikkFycVNc4ZA6VTTkPCQ3pLCFDZTGIYiAg3vcMo',
  serviceRoleKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDc3NDYyMjk4LCJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsInN1YiI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9.VLdM-r8LxSHusVoRRnGcz3vFUBblQ3iEWYDHklo8ecQ',
}

function normalizeLocalUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_LOCAL_SUPABASE_URL

  let candidate = trimmed
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `http://${candidate}`
  }

  try {
    const url = new URL(candidate)

    if (!url.port) {
      url.port = '54321'
    }

    url.pathname = '/'
    url.search = ''
    url.hash = ''
    return url.origin
  } catch {
    return DEFAULT_LOCAL_SUPABASE_URL
  }
}

type LocalOverrideEnv = NodeJS.ProcessEnv & {
  SUPABASE_LOCAL_URL?: string
  SUPABASE_LOCAL_ANON_KEY?: string
  SUPABASE_LOCAL_SERVICE_ROLE_KEY?: string
}

export function getLocalSupabaseDefaults(
  env: LocalOverrideEnv = process.env,
): typeof LOCAL_SUPABASE_DEFAULTS {
  const customUrl = env.SUPABASE_LOCAL_URL?.trim()
  const url = customUrl ? normalizeLocalUrl(customUrl) : LOCAL_SUPABASE_DEFAULTS.url
  const anonKey = env.SUPABASE_LOCAL_ANON_KEY?.trim() || LOCAL_SUPABASE_DEFAULTS.anonKey
  const serviceRoleKey =
    env.SUPABASE_LOCAL_SERVICE_ROLE_KEY?.trim() || LOCAL_SUPABASE_DEFAULTS.serviceRoleKey

  return {
    url,
    anonKey,
    serviceRoleKey,
  } as const
}

export function shouldUseLocalSupabaseDefaults(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.SUPABASE_DISABLE_LOCAL_DEFAULTS === '1') {
    return false
  }

  const isProd = env.NODE_ENV === 'production'
  const runningInManagedEnv =
    env.VERCEL === '1' ||
    env.CI === '1' ||
    env.CI?.toLowerCase() === 'true'

  if (runningInManagedEnv) {
    return false
  }

  if (isProd) {
    return false
  }

  return true
}
