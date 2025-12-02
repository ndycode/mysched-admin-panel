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

import { PROFILE_COLUMNS, ProfileRow, toDto } from './shared'
import { UserCreateSchema } from './schemas'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

type UsersStats = {
  total: number
  activeUsers: number
  instructorCount: number
  adminCount: number
}

function createEmptyStats(total: number): UsersStats {
  return {
    total,
    activeUsers: 0,
    instructorCount: 0,
    adminCount: 0,
  }
}

async function fetchProfilesAndAdmins(client: ReturnType<typeof sbService>, ids: string[]) {
  if (ids.length === 0) {
    return { profileMap: new Map<string, ProfileRow>(), adminIds: new Set<string>() }
  }

  const { data: profileRows, error } = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .in('id', ids)
  if (error) throw createHttpError(500, 'Failed to load profiles', error)

  const { data: adminRows, error: adminError } = await client
    .from('admins')
    .select('user_id')
    .in('user_id', ids)
  if (adminError) throw createHttpError(500, 'Failed to load admin memberships', adminError)

  const profileMap = new Map(
    ((profileRows as ProfileRow[] | null) ?? []).map(profile => [profile.id, profile]),
  )
  const adminIds = new Set(((adminRows as Array<{ user_id: string }> | null) ?? []).map(row => row.user_id))
  return { profileMap, adminIds }
}

function accumulateStats(rows: ReturnType<typeof toDto>[], stats: UsersStats) {
  for (const row of rows) {
    if (row.status === 'active') stats.activeUsers += 1
    if (row.role === 'instructor') stats.instructorCount += 1
    if (row.role === 'admin') stats.adminCount += 1
  }
}

async function computeUserStats(
  client: ReturnType<typeof sbService>,
  total: number,
  limit: number,
  currentPage: number,
  currentRows: ReturnType<typeof toDto>[],
) {
  const stats = createEmptyStats(total)
  accumulateStats(currentRows, stats)

  if (currentRows.length >= total) {
    return stats
  }

  const totalPages = Math.ceil(total / limit)
  const remainingPages: number[] = []
  for (let page = currentPage + 1; page <= totalPages; page++) {
    remainingPages.push(page)
  }

  const BATCH_SIZE = 5
  for (let index = 0; index < remainingPages.length; index += BATCH_SIZE) {
    const batch = remainingPages.slice(index, index + BATCH_SIZE)
    const pageResults = await Promise.all(
      batch.map(async page => {
        const result = await client.auth.admin.listUsers({ page, perPage: limit })
        if (result.error) {
          const status = typeof result.error.status === 'number' ? result.error.status : 500
          throw createHttpError(status, result.error.message || 'Failed to load users.', result.error)
        }
        return result.data.users ?? []
      }),
    )

    const users = pageResults.flat()
    if (users.length === 0) {
      continue
    }

    const ids = users.map(user => user.id)
    const { profileMap, adminIds } = await fetchProfilesAndAdmins(client, ids)
    const rows = users.map(user => toDto(user, profileMap.get(user.id), adminIds))
    accumulateStats(rows, stats)
  }

  return stats
}

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
  if (typeof message === 'string' && message.toLowerCase().includes('already registered')) {
    return { status: 409, message: 'Email already registered.' }
  }
  if (typeof status === 'number' && status >= 400) {
    return { status, message }
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const parsed = QuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()))
    if (!parsed.success) {
      const flat = parsed.error.flatten()
      const messages = [
        ...flat.formErrors,
        ...Object.values(flat.fieldErrors ?? {}).flat(),
      ].filter((msg): msg is string => Boolean(msg && msg.length))
      return json({ error: messages.join(', ') || 'Invalid query' }, 400)
    }

    const { page, limit } = parsed.data
    const sb = sbService()
    const result = await sb.auth.admin.listUsers({ page, perPage: limit })
    if (result.error) {
      const status = typeof result.error.status === 'number' ? result.error.status : 500
      throw createHttpError(status, result.error.message || 'Failed to load users.', result.error)
    }

    const users = result.data.users ?? []
    const ids = users.map(user => user.id)
    const { profileMap, adminIds } = await fetchProfilesAndAdmins(sb, ids)
    const rows = users.map(user => toDto(user, profileMap.get(user.id), adminIds))
    const total = typeof result.data.total === 'number' ? result.data.total : rows.length
    const stats = await computeUserStats(sb, total, limit, page, rows)

    return json({ rows, count: total, page, limit, stats })
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

    const msg = logErr('/api/users GET', e, { method: req.method })
    await auditError('system', 'users', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function POST(req: NextRequest) {
  let createdUserId: string | null = null
  let client: ReturnType<typeof sbService> | null = null
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()

    const payload = UserCreateSchema.parse(await req.json())

    client = sbService()

    const userMetadata: Record<string, unknown> = {
      full_name: payload.full_name,
    }
    if (payload.student_id) {
      userMetadata.student_id = payload.student_id
    }
    if (payload.app_user_id) {
      userMetadata.app_user_id = payload.app_user_id
    }
    const appMetadata: Record<string, unknown> = {}

    if (payload.role) {
      userMetadata.role = payload.role
      userMetadata.roles = [payload.role]
      appMetadata.role = payload.role
      appMetadata.roles = [payload.role]
    }
    if (payload.status) {
      userMetadata.status = payload.status
      appMetadata.status = payload.status
    }

    const created = await client.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: Object.keys(appMetadata).length > 0 ? appMetadata : undefined,
    })

    if (created.error || !created.data?.user) {
      const mapped = mapAuthAdminError(created.error)
      if (mapped) return json({ error: mapped.message }, mapped.status)
      const status = typeof created.error?.status === 'number' ? created.error.status : 500
      throw createHttpError(status, created.error?.message || 'Failed to create user', created.error ?? undefined)
    }

    const user = created.data.user
    createdUserId = user.id

    const profileInput: ProfileRow = {
      id: user.id,
      full_name: payload.full_name,
      email: user.email ?? payload.email,
      avatar_url: (user.user_metadata?.avatar_url as string | null) ?? null,
    }

    if (payload.student_id) {
      profileInput.student_id = payload.student_id
    }
    if (payload.app_user_id) {
      profileInput.app_user_id = payload.app_user_id
    }

    const { data: profileRow, error: profileError } = await client
      .from('profiles')
      .upsert(profileInput, { onConflict: 'id' })
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) throw createHttpError(500, 'Failed to persist profile', profileError)
    const typedProfile = (profileRow as ProfileRow | null) ?? null

    if (Object.prototype.hasOwnProperty.call(payload, 'role')) {
      if (payload.role === 'admin') {
        const { error: adminUpsertError } = await client
          .from('admins')
          .upsert({ user_id: user.id }, { onConflict: 'user_id' })
        if (adminUpsertError) throw createHttpError(500, 'Failed to grant admin role', adminUpsertError)
      } else {
        const { error: adminDeleteError } = await client.from('admins').delete().eq('user_id', user.id)
        if (adminDeleteError) throw createHttpError(500, 'Failed to revoke admin role', adminDeleteError)
      }
    }

    await audit(admin.id, 'users', 'insert', user.id, {
      details: {
        ...profileInput,
        role: payload.role ?? null,
        status: payload.status ?? null,
      },
    })

    return json(toDto(user, typedProfile ?? profileInput))
  } catch (e) {
    if (createdUserId) {
      try {
        const cleanupClient = client ?? sbService()
        await cleanupClient.auth.admin.deleteUser(createdUserId)
      } catch (cleanupError) {
        logErr('Failed to clean up orphaned auth user', cleanupError, {
          userId: createdUserId,
        })
      }
    }
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
    if (status === 429) {
      return json({ error: 'Too many requests. Please wait and try again.' }, 429)
    }

    const msg = logErr('/api/users POST', e, { method: req.method })
    await auditError('system', 'users', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function PATCH() {
  return json({ error: 'Use /api/users/[id] for updates' }, 405)
}
