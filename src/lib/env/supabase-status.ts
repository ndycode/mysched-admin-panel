import { ensureEnv } from './core'
import { getLocalSupabaseDefaults } from '../supabase-defaults'

export type SupabaseBrowserStatus = {
  configured: boolean
  missingPublicKeys: string[]
  usingLocalFallback: boolean
  serviceRoleConfigured: boolean
  runningOnVercel: boolean
  vercelProjectName: string | null
}

export function getSupabaseBrowserStatus(): SupabaseBrowserStatus {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

  const snapshot = ensureEnv()
  const diagnostics = snapshot.diagnostics

  const resolvedUrl = rawUrl || snapshot.cache.supabaseUrl || ''
  const resolvedAnon = rawAnon || snapshot.cache.supabaseAnonKey || ''

  const missingPublicKeys: string[] = []
  if (!resolvedUrl) {
    missingPublicKeys.push('NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!resolvedAnon) {
    missingPublicKeys.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const localDefaults = getLocalSupabaseDefaults()

  const usingLocalFallback =
    process.env.NEXT_PUBLIC_SUPABASE_USING_LOCAL_DEFAULTS === '1' ||
    diagnostics.usingLocalDefaults.supabaseUrl ||
    diagnostics.usingLocalDefaults.supabaseAnonKey ||
    (resolvedUrl === localDefaults.url && resolvedAnon === localDefaults.anonKey)

  let serviceRoleConfigured: boolean
  if (process.env.NEXT_PUBLIC_SUPABASE_HAS_SERVICE_ROLE === '1') {
    serviceRoleConfigured = true
  } else if (process.env.NEXT_PUBLIC_SUPABASE_HAS_SERVICE_ROLE === '0') {
    serviceRoleConfigured = false
  } else {
    serviceRoleConfigured =
      !diagnostics.missing.supabaseServiceRole && !diagnostics.usingLocalDefaults.supabaseServiceRole
  }

  const configured = missingPublicKeys.length === 0 && !usingLocalFallback

  const runningOnVercel = process.env.NEXT_PUBLIC_VERCEL === '1'
  const vercelProjectNameRaw = process.env.NEXT_PUBLIC_VERCEL_PROJECT_NAME
  const vercelProjectName = vercelProjectNameRaw ? vercelProjectNameRaw.trim() || null : null

  return {
    configured,
    missingPublicKeys,
    usingLocalFallback,
    serviceRoleConfigured,
    runningOnVercel,
    vercelProjectName,
  }
}
