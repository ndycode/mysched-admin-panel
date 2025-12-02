import {
  getSupabaseEnvSnapshot,
  SupabaseConfigError,
  type CachedEnv,
  type Diagnostics,
} from './env/core'
import { getSiteAllowList } from './env/site'
import {
  getSupabaseBrowserConfig,
  getSupabaseConfig,
  getServiceRoleKey,
  isSupabaseConfigured,
} from './env/supabase-config'
import { getSupabaseBrowserStatus, type SupabaseBrowserStatus } from './env/supabase-status'

const initial = getSupabaseEnvSnapshot()

export const publicEnv = {
  supabaseUrl: initial.cache.supabaseUrl,
  supabaseAnonKey: initial.cache.supabaseAnonKey,
  siteUrl: initial.cache.siteUrl,
  siteUrls: initial.cache.siteUrls,
} as const

export const envDiagnostics = initial.diagnostics

export {
  getSupabaseEnvSnapshot,
  getSupabaseBrowserStatus,
  getSupabaseBrowserConfig,
  getSupabaseConfig,
  getServiceRoleKey,
  isSupabaseConfigured,
  getSiteAllowList,
  SupabaseConfigError,
}

export type { SupabaseBrowserStatus, CachedEnv, Diagnostics }
