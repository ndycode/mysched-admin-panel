import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseConfig, SupabaseConfigError } from './env'

function assertSupabaseServiceConfig() {
  const config = getSupabaseConfig()
  return { url: config.url, service: config.serviceRole }
}

type ServiceClient = SupabaseClient

const globalSupabase = globalThis as typeof globalThis & {
  __myschedServiceClient?: ServiceClient
}

function createServiceClient() {
  const { url, service } = assertSupabaseServiceConfig()
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as ServiceClient
}

/**
 * Returns a memoized Supabase service client using environment credentials.
 */
export function sbService(): ServiceClient {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase service client is only available on the server.')
  }
  if (!globalSupabase.__myschedServiceClient) {
    globalSupabase.__myschedServiceClient = createServiceClient()
  }
  return globalSupabase.__myschedServiceClient!
}

export { SupabaseConfigError, assertSupabaseServiceConfig }
