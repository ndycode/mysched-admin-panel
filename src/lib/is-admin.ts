// src/lib/is-admin.ts
import { sbServer } from '@/lib/supabase-server'
import { sbService } from '@/lib/supabase-service'

type SupaUser = {
  id: string
  email?: string | null
  app_metadata?: Record<string, unknown> | null
  user_metadata?: Record<string, unknown> | null
}

/**
 * Returns the signed-in user and whether they are an admin.
 * Uses service-role to read public.admins to avoid RLS issues.
 */
export async function getUserAndAdmin(): Promise<{ user: SupaUser | null; isAdmin: boolean }> {
  // 1) get current auth user from cookies
  const sb = await sbServer()
  const { data: u, error: uerr } = await sb.auth.getUser()
  if (uerr || !u?.user) return { user: null, isAdmin: false }
  const user = u.user as SupaUser

  // 2) check admins table with service-role (server-only)
  const svc = sbService()
  const { data: row, error } = await svc
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return { user, isAdmin: !!row && !error }
}
