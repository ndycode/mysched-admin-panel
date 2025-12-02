// create index if not exists idx_classes_section on classes(section_id);
// create index if not exists idx_classes_day on classes(day);
// create index if not exists idx_sections_code on sections(lower(code));
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/authz'
import { audit, auditError } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/csrf'
import { extractStatus, validationDetails } from '@/lib/api-error'
import { logErr } from '@/lib/log'
import { getClientIp } from '@/lib/request'
import { sbService } from '@/lib/supabase-service'
import { throttle } from '@/lib/rate'
import { createHttpError } from '@/lib/http-error'
import type { PostgrestError } from '@supabase/supabase-js'

import { canonicalDay } from '@/lib/days'
import { dayDbVariants, isDayColumnError } from '@/lib/day-storage'

import { z } from 'zod'

import { ClassCreateSchema } from './schemas'

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

type SortKey =
  | 'id'
  | 'code'
  | 'title'
  | 'instructor'
  | 'room'
  | 'start'
  | 'end'
  | 'units'
  | 'day'
  | 'section'
  | 'schedule'

type SortDirection = 'asc' | 'desc'

type SortConfig = {
  column: string
  defaultDirection: SortDirection
  nullsFirst: boolean
  then?: Array<{
    column: string
    direction?: SortDirection
    nullsFirst?: boolean
  }>
}

const SORT_CONFIGS: Record<SortKey, SortConfig> = {
  id: { column: 'id', defaultDirection: 'asc', nullsFirst: false },
  code: { column: 'code', defaultDirection: 'asc', nullsFirst: false },
  title: { column: 'title', defaultDirection: 'asc', nullsFirst: false },
  instructor: { column: 'instructor_profile(full_name)', defaultDirection: 'asc', nullsFirst: true },
  room: { column: 'room', defaultDirection: 'asc', nullsFirst: true },
  start: { column: 'start', defaultDirection: 'asc', nullsFirst: true },
  end: { column: 'end', defaultDirection: 'asc', nullsFirst: true },
  units: { column: 'units', defaultDirection: 'desc', nullsFirst: true },
  day: { column: 'day', defaultDirection: 'asc', nullsFirst: true },
  section: { column: 'section_id', defaultDirection: 'asc', nullsFirst: true },
  schedule: {
    column: 'day',
    defaultDirection: 'asc',
    nullsFirst: false,
    then: [
      { column: 'start', direction: 'asc', nullsFirst: false },
      { column: 'id', direction: 'asc', nullsFirst: false },
    ],
  },
}

export const SEARCHABLE_COLUMNS = ['title', 'code', 'room'] as const

function parseSortKey(value: string | null): SortKey {
  if (!value) return 'id'
  const lower = value.toLowerCase()
  if (lower in SORT_CONFIGS) return lower as SortKey
  return 'id'
}

function parseDirection(value: string | null, fallback: SortDirection): SortDirection {
  if (!value) return fallback
  const lower = value.toLowerCase()
  if (lower === 'asc' || lower === 'desc') return lower
  return fallback
}

export function sanitizeSearchTerm(term: string | null): string | null {
  if (!term) return null
  const cleaned = term
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/[,*%]/g, ' ')
    .trim()
  if (!cleaned) return null
  return cleaned.replace(/\s+/g, ' ')
}

export function applySearchFilter<T extends { or: (filters: string) => T }>(
  query: T,
  term: string,
): T {
  if (!term) return query
  const escaped = term.replace(/[%_]/g, (char) => `\\${char}`)
  const pattern = `%${escaped}%`
  const filters = SEARCHABLE_COLUMNS.map((col) => `${col}.ilike.${pattern}`).join(',')
  return query.or(filters)
}

function mapDatabaseError(error: unknown): { status: number; message: string } | null {
  if (!error || typeof error !== 'object') return null
  const code = (error as { code?: string | null }).code
  const details = (error as { details?: string | null }).details ?? ''
  switch (code) {
    case '23505':
      return { status: 409, message: 'Class code already exists.' }
    case '23503':
      if (details.includes('section_id')) {
        return { status: 422, message: 'Section does not exist.' }
      }
      if (details.includes('instructor_id')) {
        return { status: 422, message: 'Instructor does not exist.' }
      }
      return { status: 422, message: 'Related record not found.' }
    default:
      return null
  }
}

type DbInstructorProfile = {
  id: string
  full_name: string | null
  email: string | null
  title: string | null
  department: string | null
  avatar_url: string | null
}

type DbClassRow = {
  id: number
  section_id: number | null
  day: string | number | null
  start: string | null
  end: string | null
  code: string | null
  title: string | null
  units: number | null
  room: string | null
  instructor_id: string | null
  instructor_profile: DbInstructorProfile | null
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const sb = sbService()
    const sp = new URL(req.url).searchParams
    const section = sp.get('section_id')
    const instructorId = sp.get('instructor_id')
    const day = sp.get('day')
    const page = Math.max(1, Number(sp.get('page') || '1') || 1)
    const limitRaw = Number(sp.get('limit') || '0')
    const limit = Math.min(200, limitRaw > 0 ? limitRaw : 100)
    const from = (page - 1) * limit
    const to = from + limit - 1
    const search = sanitizeSearchTerm(sp.get('search'))
    const sortKey = parseSortKey(sp.get('sort'))
    const sortConfig = SORT_CONFIGS[sortKey]
    const direction = parseDirection(sp.get('direction'), sortConfig.defaultDirection)

    let q = sb
      .from('classes')
      .select(
        '*, instructor_profile:instructor_id(id, full_name, email, title, department, avatar_url)',
        { count: 'exact' },
      )
    if (section && section !== 'all') q = q.eq('section_id', Number(section))
    if (instructorId && instructorId !== 'all') q = q.eq('instructor_id', instructorId)
    if (day && day !== 'all') {
      const normalized = canonicalDay(day)
      if (!normalized) {
        return json({ error: 'Invalid day filter.' }, 422)
      }
      const enumValue = normalized.slice(0, 3) // matches dow enum values like Mon, Tue, Wed
      q = q.eq('day', enumValue)
    }
    if (search) {
      // First, find matching instructors
      const { data: matchingInstructors } = await sb
        .from('instructors')
        .select('id')
        .ilike('full_name', `%${search}%`)
        .limit(50)

      const instructorIds = matchingInstructors?.map(i => i.id) || []

      let orFilter = SEARCHABLE_COLUMNS.map((col) => `${col}.ilike.%${search}%`).join(',')
      if (instructorIds.length > 0) {
        orFilter += `,instructor_id.in.(${instructorIds.join(',')})`
      }
      q = q.or(orFilter)
    }
    q = q.order(sortConfig.column, {
      ascending: direction === 'asc',
      nullsFirst: sortConfig.nullsFirst,
    })
    if (sortConfig.then && sortConfig.then.length > 0) {
      for (const secondary of sortConfig.then) {
        q = q.order(secondary.column, {
          ascending: (secondary.direction ?? direction) === 'asc',
          nullsFirst: secondary.nullsFirst ?? false,
        })
      }
    }
    if (
      sortConfig.column !== 'id' &&
      !(sortConfig.then ?? []).some(item => item.column === 'id')
    ) {
      q = q.order('id', { ascending: true, nullsFirst: false })
    }
    q = q.range(from, to)

    const { data, error, count } = await q
    if (error) {
      const mapped = mapDatabaseError(error)
      if (mapped) return json({ error: mapped.message }, mapped.status)
      throw createHttpError(500, 'Failed to load classes', error)
    }
    const rows = ((data ?? []) as DbClassRow[]).map(row => ({
      ...row,
      day: canonicalDay(row.day) ?? null,
      instructor:
        (() => {
          const name = row.instructor_profile?.full_name ?? null
          if (name && name.trim().toLowerCase() === 'unassigned') return null
          return name
        })(),
      instructor_profile:
        row.instructor_profile &&
          row.instructor_profile.full_name &&
          row.instructor_profile.full_name.trim().toLowerCase() === 'unassigned'
          ? null
          : row.instructor_profile,
    }))
    return json({ rows, count: count ?? 0, page, limit })
  } catch (e) {
    const status = extractStatus(e)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'You do not have access to this resource.' }, 403)
    }
    const msg = logErr('/api/classes GET', e, { method: req.method })
    await auditError('system', 'classes', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function POST(
  req: NextRequest
): Promise<ReturnType<typeof json>> {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const user = await requireAdmin()

    const input = ClassCreateSchema.parse(await req.json())
    const dayCandidates = input.day == null ? [] : dayDbVariants(input.day)
    if (input.day != null && dayCandidates.length === 0) {
      return json({ error: 'Invalid day value.' }, 422)
    }

    const dayVariants: Array<string | number | null> =
      dayCandidates.length > 0 ? (dayCandidates as Array<string | number>) : [null]

    const basePayload: Record<string, unknown> = { ...input }
  delete basePayload.day
  // The 'instructor' column does not exist in the schema, so we remove it from the payload.
  // We only use instructor_id.
  delete basePayload.instructor

  if (Object.prototype.hasOwnProperty.call(basePayload, 'instructor_id')) {
    basePayload.instructor_id = input.instructor_id ?? null
  } else {
    basePayload.instructor_id = null
  }
  const sb = sbService()
  let created: Record<string, unknown> | null = null
  let resultData: Record<string, unknown> | null = null
  let lastError: PostgrestError | null = null

    for (const variant of dayVariants) {
      const attemptPayload = { ...basePayload, day: variant }
      const { data, error } = await sb
        .from('classes')
        .insert(attemptPayload)
        .select('*, instructor_profile:instructor_id(id, full_name, email, title, department, avatar_url)')
        .single()
      if (!error && data) {
        created = attemptPayload
        resultData = (data ?? null) as Record<string, unknown> | null
        lastError = null
        break
      }
      lastError = error ?? ({ code: 'NO_DATA', details: 'No data returned' } as PostgrestError)
      if (!isDayColumnError(error)) {
        break
      }
    }

    if (!resultData) {
      if (lastError) {
        const mapped = mapDatabaseError(lastError)
        if (mapped) return json({ error: mapped.message }, mapped.status)
      }
      throw createHttpError(500, 'Failed to create class', lastError ?? undefined)
    }

    const auditPayload = created ?? { ...basePayload, day: dayVariants[0] ?? null }
    await audit(user.id, 'classes', 'insert', (resultData as { id: number }).id, {
      details: auditPayload,
    })
    return json(resultData)
  } catch (e: unknown) {
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

    const msg = logErr('/api/classes POST', e, { method: req.method })
    await auditError('system', 'classes', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function PATCH() {
  const res = json({ error: 'Use /api/classes/[id] for updates' }, 405)
  return res
}
