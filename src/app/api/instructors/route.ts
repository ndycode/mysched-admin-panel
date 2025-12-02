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

const InstructorCreateSchema = z
  .object({
    full_name: z.string().trim().min(1, 'Full name is required').max(160, 'Max 160 characters'),
    email: z.string().trim().email('Invalid email address').max(320).nullable().optional(),
    title: z.string().trim().max(120).nullable().optional(),
    department: z.string().trim().max(160).nullable().optional(),
    avatar_url: z.string().trim().url('Avatar URL must be valid').max(2048).nullable().optional(),
  })
  .strict()

type SortKey = 'name' | 'recent'

const SORT_COLUMNS = new Map<SortKey, { column: 'full_name' | 'created_at'; defaultDirection: 'asc' | 'desc' }>([
  ['name', { column: 'full_name', defaultDirection: 'asc' }],
  ['recent', { column: 'created_at', defaultDirection: 'desc' }],
])

function isSortKey(value: string): value is SortKey {
  return value === 'name' || value === 'recent'
}

function trimOrNull(value: string | null | undefined) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function sanitizeSearch(term: string | null): string | null {
  if (!term) return null
  const cleaned = term.replace(/[\u0000-\u001f]/g, '').replace(/[,*%]/g, ' ').trim()
  if (!cleaned) return null
  return cleaned.replace(/\s+/g, ' ')
}

function parseDirection(value: string | null, fallback: 'asc' | 'desc'): 'asc' | 'desc' {
  if (!value) return fallback
  const lower = value.toLowerCase()
  return lower === 'desc' || lower === 'asc' ? lower : fallback
}

function mapDatabaseError(error: unknown): { status: number; message: string } | null {
  if (!error || typeof error !== 'object') return null
  const code = (error as { code?: string | null }).code
  switch (code) {
    case '23505':
      return { status: 409, message: 'An instructor with this information already exists.' }
    case '23503':
      return { status: 422, message: 'Related record not found.' }
    default:
      return null
  }
}

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const sb = sbService()
    const sp = new URL(req.url).searchParams
    const search = sanitizeSearch(sp.get('search'))
    const departmentRaw = trimOrNull(sp.get('department'))
    const limit = Math.min(200, Math.max(1, Number(sp.get('limit') || '20') || 20))
    const page = Math.max(1, Number(sp.get('page') || '1') || 1)
    const from = (page - 1) * limit
    const to = from + limit - 1
    const rawSort = sp.get('sort')?.toLowerCase() ?? 'recent'
    const sortKey: SortKey = isSortKey(rawSort) ? rawSort : 'recent'
    const sortConfig = SORT_COLUMNS.get(sortKey)!
    const direction = parseDirection(sp.get('direction'), sortConfig.defaultDirection)

    let query = sb.from('instructors').select('*', { count: 'exact' })
    if (search) {
      const escaped = search.replace(/[%_]/g, '\\$&')
      const pattern = `%${escaped}%`
      query = query.or(
        ['full_name', 'email', 'department', 'title']
          .map(column => `${column}.ilike.${pattern}`)
          .join(','),
      )
    }
    if (departmentRaw) {
      const escapedDept = departmentRaw.replace(/[%_]/g, '\\$&')
      query = query.ilike('department', `%${escapedDept}%`)
    }

    query = query.order(sortConfig.column, { ascending: direction === 'asc' })
    if (sortConfig.column !== 'created_at') {
      query = query.order('created_at', { ascending: false })
    }
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) {
      const mapped = mapDatabaseError(error)
      if (mapped) return json({ error: mapped.message }, mapped.status)
      throw createHttpError(500, 'Failed to load instructors', error)
    }

    return json({ rows: data ?? [], count: count ?? 0, page, limit })
  } catch (e) {
    const status = extractStatus(e)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'You do not have access to this resource.' }, 403)
    }
    const msg = logErr('/api/instructors GET', e, { method: req.method })
    await auditError('system', 'instructors', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    const input = InstructorCreateSchema.parse(await req.json())

    const payload = {
      full_name: input.full_name.trim(),
      email: trimOrNull(input.email ?? null),
      title: trimOrNull(input.title ?? null),
      department: trimOrNull(input.department ?? null),
      avatar_url: trimOrNull(input.avatar_url ?? null),
    }

    const sb = sbService()
    const { data, error } = await sb
      .from('instructors')
      .insert(payload)
      .select()
      .single()
    if (error) {
      const mapped = mapDatabaseError(error)
      if (mapped) return json({ error: mapped.message }, mapped.status)
      throw createHttpError(500, 'Failed to create instructor', error)
    }

    await audit(admin.id, 'instructors', 'insert', (data as { id: string }).id, { details: payload })
    return json(data, 201)
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
    if (status === 429) {
      return json({ error: 'Too many requests. Please wait and try again.' }, 429)
    }

    const msg = logErr('/api/instructors POST', e, { method: req.method })
    await auditError('system', 'instructors', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function PATCH() {
  return json({ error: 'Use /api/instructors/[id] for updates.' }, 405)
}
