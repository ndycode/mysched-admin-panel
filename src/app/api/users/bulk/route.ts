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

import { PROFILE_COLUMNS, ProfileRow, RoleEnum, StatusEnum, UserRow, toDto } from '../shared'

const BulkUserSchema = z.object({
  ids: z.array(z.string().uuid('Invalid user id')).min(1, 'At least one user id is required'),
  values: z
    .object({
      role: RoleEnum.optional(),
      status: StatusEnum.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'No changes supplied' }),
})

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

function mapAuthAdminError(error: unknown): { status: number; message: string } | null {
  if (!error || typeof error !== 'object') return null
  const status = (error as { status?: number }).status
  const message = (error as { message?: string }).message ?? 'Request failed.'
  if (typeof status === 'number' && status === 404) {
    return { status: 404, message: 'User not found.' }
  }
  if (typeof message === 'string' && message.toLowerCase().includes('not found')) {
    return { status: 404, message: 'User not found.' }
  }
  if (typeof message === 'string' && message.toLowerCase().includes('already registered')) {
    return { status: 409, message: 'Email already registered.' }
  }
  if (typeof status === 'number' && status >= 400) {
    return { status, message }
  }
  return null
}

export async function PATCH(req: NextRequest) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()

    const payload = BulkUserSchema.parse(await req.json())
    const ids = Array.from(new Set(payload.ids))
    const values = payload.values

    const sb = sbService()
    const updatedRows: UserRow[] = []

    for (const id of ids) {
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
      const currentUser = existing.data.user

      const userMetadata = { ...(currentUser.user_metadata ?? {}) }
      const appMetadata = { ...(currentUser.app_metadata ?? {}) }
      const adminUpdates: Record<string, unknown> = {}

      if (values.role) {
        userMetadata.role = values.role
        userMetadata.roles = [values.role]
        appMetadata.role = values.role
        appMetadata.roles = [values.role]
      }
      if (values.status) {
        userMetadata.status = values.status
        appMetadata.status = values.status
      }

      if (Object.keys(userMetadata).length > 0) {
        adminUpdates.user_metadata = userMetadata
      }
      if (Object.keys(appMetadata).length > 0) {
        adminUpdates.app_metadata = appMetadata
      }

      if (Object.keys(adminUpdates).length === 0) {
        continue
      }

      const updated = await sb.auth.admin.updateUserById(id, adminUpdates)
      if (updated.error) {
        const mapped = mapAuthAdminError(updated.error)
        if (mapped) return json({ error: mapped.message }, mapped.status)
        const notFound = toSupabaseNotFoundError(updated.error, 'User not found.')
        if (notFound) throw notFound
        const status = typeof updated.error.status === 'number' ? updated.error.status : 500
        throw createHttpError(status, updated.error.message ?? 'Failed to update user.', updated.error)
      }
      if (!updated.data.user) {
        throw createHttpError(404, 'User not found.')
      }

      const { data: profileRecord, error: profileError } = await sb
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', id)
        .maybeSingle()
      if (profileError) throw createHttpError(500, 'Failed to load profile', profileError)

      const profile = (profileRecord as ProfileRow | null) ?? null
      updatedRows.push(toDto(updated.data.user, profile))

      if (Object.prototype.hasOwnProperty.call(values, 'role')) {
        if (values.role === 'admin') {
          const { error: adminUpsertError } = await sb
            .from('admins')
            .upsert({ user_id: id }, { onConflict: 'user_id' })
          if (adminUpsertError) throw createHttpError(500, 'Failed to grant admin role', adminUpsertError)
        } else {
          const { error: adminDeleteError } = await sb.from('admins').delete().eq('user_id', id)
          if (adminDeleteError) throw createHttpError(500, 'Failed to revoke admin role', adminDeleteError)
        }
      }
      await audit(admin.id, 'users', 'update', id, { details: values })
    }

    return json({ rows: updatedRows, count: updatedRows.length })
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
      return json({ error: 'Request origin is not allowed.' }, 403)
    }
    if (status === 404) {
      const message = e instanceof Error ? e.message : 'User not found.'
      return json({ error: message }, 404)
    }
    if (status === 429) {
      return json({ error: 'Too many requests. Please wait and try again.' }, 429)
    }

    const msg = logErr('/api/users/bulk PATCH', e, {})
    await auditError('system', 'users', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export const dynamic = 'force-dynamic'
