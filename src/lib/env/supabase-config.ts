import { normalizeSupabaseUrl } from '../env-alias'
import { ensureEnv, SupabaseConfigError } from './core'

function missingError(prefix: string, keys: string[]): SupabaseConfigError {
  return new SupabaseConfigError(`${prefix} Missing environment variables: ${keys.join(', ')}`, keys)
}

export function getSupabaseBrowserConfig(): { url: string; anon: string } {
  if (typeof window !== 'undefined') {
    const globalEnv = globalThis as typeof globalThis & {
      __MYSCHED_PUBLIC_ENV__?: {
        supabaseUrl?: string | null
        supabaseAnonKey?: string | null
      }
    }

    const inlineUrlRaw = process.env?.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const inlineUrl = inlineUrlRaw ? normalizeSupabaseUrl(inlineUrlRaw) : ''
    const inlineAnon = process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

    const injected = globalEnv.__MYSCHED_PUBLIC_ENV__
    const injectedUrlRaw = injected?.supabaseUrl?.trim()
    const injectedUrl = injectedUrlRaw ? normalizeSupabaseUrl(injectedUrlRaw) : ''
    const injectedAnon = injected?.supabaseAnonKey?.trim() ?? ''

    let resolvedUrl = inlineUrl || injectedUrl
    let resolvedAnon = inlineAnon || injectedAnon

    if (!resolvedUrl || !resolvedAnon) {
      try {
        const { cache } = ensureEnv()
        if (!resolvedUrl && cache.supabaseUrl) {
          resolvedUrl = cache.supabaseUrl
        }
        if (!resolvedAnon && cache.supabaseAnonKey) {
          resolvedAnon = cache.supabaseAnonKey
        }
      } catch {
        // ignore and fall through to missing error handling
      }
    }

    const missing: string[] = []
    if (!resolvedUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!resolvedAnon) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    if (missing.length) {
      throw missingError('Supabase public credentials are not configured.', missing)
    }

    return { url: resolvedUrl, anon: resolvedAnon }
  }

  const { cache } = ensureEnv()
  const missing: string[] = []
  if (!cache.supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!cache.supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (missing.length) {
    throw missingError('Supabase public credentials are not configured.', missing)
  }
  return { url: cache.supabaseUrl!, anon: cache.supabaseAnonKey! }
}

export function getServiceRoleKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('SUPABASE service role key is server-only.')
  }
  const { serviceRole } = getSupabaseConfig()
  return serviceRole
}

export function getSupabaseConfig(): { url: string; anon: string; serviceRole: string } {
  const { cache } = ensureEnv()
  const { url, anon } = getSupabaseBrowserConfig()
  if (!cache.supabaseServiceRole) {
    throw missingError('Supabase service credentials are not configured.', ['SUPABASE_SERVICE_ROLE'])
  }
  return { url, anon, serviceRole: cache.supabaseServiceRole }
}

export function isSupabaseConfigured(): boolean {
  const { diagnostics } = ensureEnv()
  const { missing, usingLocalDefaults } = diagnostics
  return !(
    missing.supabaseUrl ||
    missing.supabaseAnonKey ||
    missing.supabaseServiceRole ||
    usingLocalDefaults.supabaseUrl ||
    usingLocalDefaults.supabaseAnonKey ||
    usingLocalDefaults.supabaseServiceRole
  )
}
