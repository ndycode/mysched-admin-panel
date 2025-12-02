// src/lib/authz.ts
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

import { getSupabaseBrowserConfig } from './env'
import { createHttpError } from './http-error'
import { sbService } from './supabase-service'

export interface AdminUser {
  id: string
  email?: string | null
}

/**
 * Enforces that the current user is a signed-in admin.
 * Throws an error with status 401 if not authenticated, or 403 if not an admin.
 * @returns {Promise<AdminUser>} The authenticated admin user.
 * @throws {Error} If unauthorized or forbidden.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const { url: supabaseUrl, anon: supabaseAnonKey } = getSupabaseBrowserConfig()
  let store
  try {
    store = await cookies()
  } catch {
    throw createHttpError(401, 'unauthorized')
  }

  // Adapter compatible with @supabase/ssr cookies API (handles both variants)
  const cookieAdapter = {
    // deprecated variant
    get(name: string) {
      return store.get(name)?.value
    },
    set(name: string, value: string, options?: CookieOptions) {
      store.set({ name, value, ...(options || {}) })
    },
    remove(name: string, options?: CookieOptions) {
      store.set({ name, value: '', ...(options || {}), maxAge: 0 })
    },
    // new variant
    getAll() {
      return store.getAll().map(c => ({ name: c.name, value: c.value }))
    },
  } as unknown as NonNullable<
    Parameters<typeof createServerClient>[2]
  >['cookies']

  const sb = createServerClient(supabaseUrl, supabaseAnonKey, { cookies: cookieAdapter })

  const { data, error } = await sb.auth.getUser()
  if (error || !data?.user) {
    throw createHttpError(401, 'unauthorized')
  }

  const svc = sbService()
  const { data: row } = await svc
    .from('admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (!row) {
    throw createHttpError(403, 'forbidden')
  }

  return { id: data.user.id, email: data.user.email ?? null }
}
