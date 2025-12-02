import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/authz'
import { audit, auditError } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/csrf'
import { extractStatus, validationDetails } from '@/lib/api-error'
import { logErr } from '@/lib/log'
import { getClientIp } from '@/lib/request'
import { sbService } from '@/lib/supabase-service'
import { throttle } from '@/lib/rate'
import { createHttpError } from '@/lib/http-error'
import { toSupabaseNotFoundError } from '@/lib/supabase-errors'

import { PROFILE_COLUMNS, ProfileRow, toDto } from '../shared'
import { UserPatchSchema } from '../schemas'

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

type P = { id: string }

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<P> }
): Promise<ReturnType<typeof json>> {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    const { id } = await context.params
    const payload = UserPatchSchema.parse(await req.json())

    const sb = sbService()
    const existing = await sb.auth.admin.getUserById(id)
    if (existing.error) {
      const mapped = toSupabaseNotFoundError(existing.error, 'User not found.')
      if (mapped) throw mapped
      const status = typeof existing.error.status === 'number' ? existing.error.status : 500
      throw createHttpError(status, existing.error.message ?? 'Failed to load user.', existing.error)
    }
    if (!existing.data.user) {
      throw createHttpError(404, 'User not found.')
    }
    let user = existing.data.user

    const metadataUpdates: Record<string, unknown> = {}
    const appMetadataUpdates: Record<string, unknown> = {}
    if (Object.prototype.hasOwnProperty.call(payload, 'full_name')) {
      metadataUpdates.full_name = payload.full_name ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'student_id')) {
      metadataUpdates.student_id = payload.student_id ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'app_user_id')) {
      metadataUpdates.app_user_id = payload.app_user_id
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'role') && payload.role) {
      metadataUpdates.role = payload.role
      metadataUpdates.roles = [payload.role]
      appMetadataUpdates.role = payload.role
      appMetadataUpdates.roles = [payload.role]
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'status') && payload.status) {
      metadataUpdates.status = payload.status
      appMetadataUpdates.status = payload.status
    }

    const adminUpdates: Record<string, unknown> = {}
    if (payload.email && payload.email !== user.email) {
      adminUpdates.email = payload.email
    }
    if (payload.password) {
      adminUpdates.password = payload.password
    }
    if (Object.keys(metadataUpdates).length > 0) {
      adminUpdates.user_metadata = { ...(user.user_metadata ?? {}), ...metadataUpdates }
    }
    if (Object.keys(appMetadataUpdates).length > 0) {
      adminUpdates.app_metadata = { ...(user.app_metadata ?? {}), ...appMetadataUpdates }
    }

    if (Object.keys(adminUpdates).length > 0) {
      const updated = await sb.auth.admin.updateUserById(id, adminUpdates)
      if (updated.error) {
        const mapped = toSupabaseNotFoundError(updated.error, 'User not found.')
        if (mapped) throw mapped
        const status = typeof updated.error.status === 'number' ? updated.error.status : 500
        throw createHttpError(status, updated.error.message ?? 'Failed to update user.', updated.error)
      }
      if (!updated.data.user) {
        throw createHttpError(404, 'User not found.')
      }
      user = updated.data.user
    }

    const { data: profileRecord, error: profileLookupError } = await sb
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (profileLookupError) throw createHttpError(500, 'Failed to load profile', profileLookupError)
    const existingProfile = (profileRecord as ProfileRow | null) ?? null

    const profilePatch: Partial<ProfileRow> = {}
    if (Object.prototype.hasOwnProperty.call(payload, 'full_name')) {
      profilePatch.full_name = (payload.full_name ?? '').trim() ? payload.full_name ?? null : null
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'student_id')) {
      profilePatch.student_id = payload.student_id ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
      profilePatch.email = payload.email ?? null
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'app_user_id')) {
      profilePatch.app_user_id = payload.app_user_id ?? null
    }

    let nextProfile = existingProfile ?? null
    if (Object.keys(profilePatch).length > 0) {
      const profileInput: ProfileRow = {
        id,
        full_name: profilePatch.full_name ?? existingProfile?.full_name ?? null,
        email: profilePatch.email ?? existingProfile?.email ?? user.email ?? null,
        avatar_url: existingProfile?.avatar_url ?? null,
      }

      const nextStudentId = profilePatch.student_id ?? existingProfile?.student_id
      if (nextStudentId !== undefined && nextStudentId !== null) {
        profileInput.student_id = nextStudentId
      }

      const nextAppUserId = profilePatch.app_user_id ?? existingProfile?.app_user_id
      if (nextAppUserId !== undefined && nextAppUserId !== null) {
        profileInput.app_user_id = nextAppUserId
      }

      const { data: profileRow, error: profileError } = await sb
        .from('profiles')
        .upsert(profileInput, { onConflict: 'id' })
        .select(PROFILE_COLUMNS)
        .eq('id', id)
        .maybeSingle()

      if (profileError) throw createHttpError(500, 'Failed to persist profile', profileError)
      nextProfile = (profileRow as ProfileRow | null) ?? profileInput
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'role')) {
      if (payload.role === 'admin') {
        const { error: adminUpsertError } = await sb
          .from('admins')
          .upsert({ user_id: id }, { onConflict: 'user_id' })
        if (adminUpsertError) throw createHttpError(500, 'Failed to grant admin role', adminUpsertError)
      } else {
        const { error: adminDeleteError } = await sb.from('admins').delete().eq('user_id', id)
        if (adminDeleteError) throw createHttpError(500, 'Failed to revoke admin role', adminDeleteError)
      }
    }

    await audit(admin.id, 'users', 'update', id, { details: payload })

    return json(toDto(user, nextProfile))
  } catch (e) {
    if (e instanceof z.ZodError) {
      const { message, issues } = validationDetails(e)
      return json({ error: message, issues }, 422)
    }

    const status = extractStatus(e)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'You do not have access to this resource.' }, 403)
    }
    if (status === 404) {
      const message = e instanceof Error ? e.message : 'User not found.'
      return json({ error: message }, 404)
    }
    if (status === 429) {
      return json({ error: 'Too many requests. Please wait and try again.' }, 429)
    }

    const msg = logErr('/api/users/[id] PATCH', e, { method: req.method })
    await auditError('system', 'users', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<P> }
): Promise<ReturnType<typeof json>> {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    const { id } = await context.params

    const sb = sbService()
    const existingUser = await sb.auth.admin.getUserById(id)
    if (existingUser.error) {
      const status = typeof existingUser.error.status === 'number' ? existingUser.error.status : 500
      throw createHttpError(status, existingUser.error.message || 'Failed to load user.', existingUser.error)
    }
    if (!existingUser.data?.user) {
      return json({ error: 'User not found.' }, 404)
    }

    const { data: profileBefore } = await sb.from('profiles').select().eq('id', id).maybeSingle()
    const removed = await sb.auth.admin.deleteUser(id)
    if (removed.error) {
      const status = typeof removed.error.status === 'number' ? removed.error.status : 500
      throw createHttpError(status, removed.error.message || 'Failed to delete user.', removed.error)
    }

    const { error: profileError } = await sb.from('profiles').delete().eq('id', id)
    if (profileError) throw createHttpError(500, 'Failed to delete profile', profileError)

    const { error: adminDeleteError } = await sb.from('admins').delete().eq('user_id', id)
    if (adminDeleteError) throw createHttpError(500, 'Failed to remove admin role', adminDeleteError)

    await audit(admin.id, 'users', 'delete', id, {
      before: {
        user: existingUser.data.user,
        profile: profileBefore ?? null,
      },
    })
    return json({ ok: true })
  } catch (e) {
    const status = extractStatus(e)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'You do not have access to this resource.' }, 403)
    }
    if (status === 429) {
      return json({ error: 'Too many requests. Please wait and try again.' }, 429)
    }

    const msg = logErr('/api/users/[id] DELETE', e, { method: req.method })
    await auditError('system', 'users', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}
