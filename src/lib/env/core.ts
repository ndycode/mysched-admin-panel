import { z } from 'zod'

import { normalizeSupabaseUrl, resolveSupabaseEnv, type RawSupabaseEnv } from '../env-alias'
import { getLocalSupabaseDefaults, shouldUseLocalSupabaseDefaults } from '../supabase-defaults'

export type RawEnv = RawSupabaseEnv & {
  NEXT_PUBLIC_SITE_URL?: string
  NEXT_PUBLIC_SITE_URLS?: string
}

const EnvSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1).optional(),
    SUPABASE_SERVICE_ROLE: z.string().trim().min(1).optional(),
    NEXT_PUBLIC_SITE_URL: z.string().trim().url().optional(),
    NEXT_PUBLIC_SITE_URLS: z.string().optional(),
  })
  .transform(value => ({
    supabaseUrl: value.NEXT_PUBLIC_SUPABASE_URL
      ? normalizeSupabaseUrl(value.NEXT_PUBLIC_SUPABASE_URL)
      : null,
    supabaseAnonKey: value.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
    supabaseServiceRole: value.SUPABASE_SERVICE_ROLE ?? null,
    siteUrl: value.NEXT_PUBLIC_SITE_URL ?? null,
    siteUrls: value.NEXT_PUBLIC_SITE_URLS
      ? value.NEXT_PUBLIC_SITE_URLS.split(',')
          .map(entry => entry.trim())
          .filter(Boolean)
      : [],
  }))

export type CachedEnv = z.infer<typeof EnvSchema>

export interface Diagnostics {
  missing: {
    supabaseUrl: boolean
    supabaseAnonKey: boolean
    supabaseServiceRole: boolean
  }
  usingLocalDefaults: {
    supabaseUrl: boolean
    supabaseAnonKey: boolean
    supabaseServiceRole: boolean
  }
}

export class SupabaseConfigError extends Error {
  status: number
  missing?: string[]

  constructor(message: string, missing?: string[]) {
    super(message)
    this.name = 'SupabaseConfigError'
    this.status = 500
    if (missing && missing.length > 0) {
      this.missing = missing
    }
  }
}

function formatIssues(error: z.ZodError<unknown>): string {
  return error.issues
    .map(issue => {
      const path = issue.path.join('.') || 'value'
      return `${path}: ${issue.message}`
    })
    .join('; ')
}

const envCache = globalThis as typeof globalThis & {
  __myschedEnvCache?: CachedEnv
  __myschedEnvDiagnostics?: Diagnostics
}

function withAliases(env: RawEnv): RawEnv {
  const next = { ...env }

  const resolved = resolveSupabaseEnv(env as RawSupabaseEnv)
  const url = resolved.url
  if (url && !next.NEXT_PUBLIC_SUPABASE_URL) {
    next.NEXT_PUBLIC_SUPABASE_URL = url
  }

  const anon = resolved.anonKey
  if (anon && !next.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    next.NEXT_PUBLIC_SUPABASE_ANON_KEY = anon
  }

  const service = resolved.serviceRole
  if (service && !next.SUPABASE_SERVICE_ROLE) {
    next.SUPABASE_SERVICE_ROLE = service
  }

  return next
}

function parseEnv(): { cache: CachedEnv; diagnostics: Diagnostics } {
  const result = EnvSchema.safeParse(withAliases(process.env as RawEnv))
  if (!result.success) {
    throw new SupabaseConfigError(`Invalid Supabase environment variables: ${formatIssues(result.error)}`)
  }

  const cache = result.data
  const usingLocalDefaults = {
    supabaseUrl: false,
    supabaseAnonKey: false,
    supabaseServiceRole: false,
  }

  let supabaseUrl = cache.supabaseUrl
  let supabaseAnonKey = cache.supabaseAnonKey
  let supabaseServiceRole = cache.supabaseServiceRole

  if (shouldUseLocalSupabaseDefaults() && (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRole)) {
    const localDefaults = getLocalSupabaseDefaults()
    if (!supabaseUrl) {
      supabaseUrl = localDefaults.url
      usingLocalDefaults.supabaseUrl = true
    }
    if (!supabaseAnonKey) {
      supabaseAnonKey = localDefaults.anonKey
      usingLocalDefaults.supabaseAnonKey = true
    }
    if (!supabaseServiceRole) {
      supabaseServiceRole = localDefaults.serviceRoleKey
      usingLocalDefaults.supabaseServiceRole = true
    }
  }

  const diagnostics: Diagnostics = {
    missing: {
      supabaseUrl: !cache.supabaseUrl,
      supabaseAnonKey: !cache.supabaseAnonKey,
      supabaseServiceRole: !cache.supabaseServiceRole,
    },
    usingLocalDefaults,
  }

  const missingKeys: string[] = []
  if (!supabaseUrl) missingKeys.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missingKeys.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!supabaseServiceRole) missingKeys.push('SUPABASE_SERVICE_ROLE')

  if (missingKeys.length && process.env.NODE_ENV !== 'test' && process.env.__MYSCHED_ENV_WARNED !== '1') {
    process.env.__MYSCHED_ENV_WARNED = '1'
    console.error(`Supabase environment variables are missing: ${missingKeys.join(', ')}`)
  }

  const usingFallbackWarn =
    (usingLocalDefaults.supabaseUrl || usingLocalDefaults.supabaseAnonKey) &&
    process.env.NODE_ENV !== 'test' &&
    process.env.__MYSCHED_LOCAL_DEFAULTS_WARNED !== '1'

  if (usingFallbackWarn) {
    process.env.__MYSCHED_LOCAL_DEFAULTS_WARNED = '1'
    console.warn('Supabase credentials are missing. Falling back to localhost defaults for development only.')
  }

  const resolved: CachedEnv = {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRole,
    siteUrl: cache.siteUrl,
    siteUrls: cache.siteUrls,
  }

  return { cache: resolved, diagnostics }
}

function ensureEnv(refresh = false): { cache: CachedEnv; diagnostics: Diagnostics } {
  if (refresh || !envCache.__myschedEnvCache || !envCache.__myschedEnvDiagnostics) {
    const { cache, diagnostics } = parseEnv()
    envCache.__myschedEnvCache = cache
    envCache.__myschedEnvDiagnostics = diagnostics
  }

  return {
    cache: envCache.__myschedEnvCache as CachedEnv,
    diagnostics: envCache.__myschedEnvDiagnostics as Diagnostics,
  }
}

export function getSupabaseEnvSnapshot({
  refresh = false,
}: { refresh?: boolean } = {}): { cache: CachedEnv; diagnostics: Diagnostics } {
  return ensureEnv(refresh)
}

export { ensureEnv }
