// src/app/admin/layout.tsx

import React from 'react'
import { redirect } from 'next/navigation'
import { sbService } from '@/lib/supabase-service'
import { sbServer } from '@/lib/supabase-server'
import { ComingSoonProvider } from '@/components/ComingSoonDialog'
import { AdminLayoutShell } from './_components/AdminLayoutShell'

import { PROFILE_COLUMNS, deriveAvatarUrl } from '@/app/api/users/shared'

export const dynamic = 'force-dynamic'

/**
 * AdminLayout - Layout for admin pages.
 * - Provides authenticated admin chrome around children
 * - Accessible main role
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  function logAdminError(type: 'unauthorized' | 'forbidden', userId?: string) {
    console.error({ route: 'admin/layout', type, userId, timestamp: new Date().toISOString() })
  }

  const sb = await sbServer()

  const { data } = await sb.auth.getUser()
  const user = data?.user
  if (!user) {
    logAdminError('unauthorized')
    redirect('/login?reason=unauthorized')
  }

  const svc = sbService()
  const { data: row } = await svc
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row) {
    logAdminError('forbidden', user?.id)
    redirect('/login?reason=forbidden')
  }

  const { data: profile } = await svc
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle()

  const fullName = (profile?.full_name ?? (user.user_metadata?.full_name as string | undefined))?.trim()
  const email = profile?.email ?? user.email ?? 'admin@mysched'
  const displayName = fullName?.length ? fullName : email.split('@')[0]
  const initial = (displayName?.[0] ?? 'A').toUpperCase()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const avatarUrl = deriveAvatarUrl(user, profile)

  return (
    <ComingSoonProvider>
      <AdminLayoutShell
        greeting={greeting}
        displayName={displayName}
        initial={initial}
        avatarUrl={avatarUrl}
        email={email}
        studentId={profile?.student_id ?? null}
      >
        {children}
      </AdminLayoutShell>
    </ComingSoonProvider>
  )
}
