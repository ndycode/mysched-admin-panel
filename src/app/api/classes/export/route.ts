import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/authz'
import { auditError } from '@/lib/audit'
import { extractStatus } from '@/lib/api-error'
import { logErr } from '@/lib/log'
import { sbService } from '@/lib/supabase-service'
import { canonicalDay, dayLabel } from '@/lib/days'
import { dayDbVariants } from '@/lib/day-storage'
import { createHttpError } from '@/lib/http-error'

import { applySearchFilter, sanitizeSearchTerm } from '../route'

type ExportRow = {
  id: number
  section_id: number | null
  day: string | number | null
  start: string | null
  end: string | null
  code: string | null
  title: string | null
  units: number | null
  room: string | null
  instructor: string | null
}

type SectionRow = {
  id: number
  code: string | null
  section_number: string | null
  class_code: string | null
  class_name: string | null
  instructor: string | null
  time_slot: string | null
  room: string | null
}

type SupabaseClassRow = Omit<ExportRow, 'instructor'> & {
  instructor?: string | null
  instructor_profile?: { full_name?: string | null } | null
  [key: string]: unknown
}

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

function classStatus(row: ExportRow): 'active' | 'inactive' | 'archived' {
  if (!row.start || !row.end || !row.day) return 'inactive'
  if (!row.section_id) return 'archived'
  return 'active'
}

function formatSchedule(row: ExportRow): string {
  if (!row.day && !row.start && !row.end) return '—'
  const day = dayLabel(row.day)
  if (!row.start || !row.end) return day
  return `${day}, ${row.start} – ${row.end}`
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || typeof value === 'undefined') return ''
  const str = String(value)
  if (str === '') return ''
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildSectionLabel(section: SectionRow | undefined | null): string {
  if (!section) return '—'
  if (section.section_number) return section.section_number
  if (section.code) return section.code
  return '—'
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const sb = sbService()
    const sp = new URL(req.url).searchParams
    const section = sp.get('section_id')
    const day = sp.get('day')
    const search = sanitizeSearchTerm(sp.get('search'))

    const page = Number(sp.get('page'))
    const limit = Number(sp.get('limit'))

    let query = sb.from('classes').select(
      'id, section_id, day, start, end, code, title, units, room, instructor_id, instructor_profile:instructor_id(full_name)',
    )

    if (section && section !== 'all') query = query.eq('section_id', Number(section))
    if (day && day !== 'all') {
      const dayValues = dayDbVariants(day)
      if (dayValues.length === 0) {
        return json({ error: 'Invalid day filter.' }, 422)
      }
      if (dayValues.length === 1) {
        query = query.eq('day', dayValues[0] as string | number)
      } else {
        query = query.in('day', dayValues as (string | number)[])
      }
    }
    if (search) query = applySearchFilter(query, search)

    query = query
      .order('title', { ascending: true, nullsFirst: true })
      .order('code', { ascending: true, nullsFirst: true })
      .order('id', { ascending: true, nullsFirst: false })

    if (page && limit) {
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)
    } else {
      query = query.limit(2000)
    }

    const { data, error } = await query
    if (error) {
      throw createHttpError(500, 'Failed to export classes', error)
    }

    const rows = (data ?? []).map(raw => {
      const row = raw as SupabaseClassRow
      return {
        ...row,
        day: canonicalDay(row.day) ?? null,
        instructor: row.instructor ?? row.instructor_profile?.full_name ?? null,
      }
    })
    const sectionIds = Array.from(
      new Set(rows.map(row => row.section_id).filter((id): id is number => typeof id === 'number')),
    )

    const sectionLookup = new Map<number, SectionRow>()
    if (sectionIds.length > 0) {
      const { data: sectionRows, error: sectionError } = await sb
        .from('sections')
        .select('id, code, section_number')
        .in('id', sectionIds)

      if (sectionError) {
        throw createHttpError(500, 'Failed to load related sections', sectionError)
      }

      sectionRows?.forEach(sectionRow => {
        sectionLookup.set(sectionRow.id, sectionRow as SectionRow)
      })
    }

  const header = [
    'Class Name',
    'Code',
    'Section',
    'Section Number',
    'Day & Time',
    'Units',
    'Room',
    'Instructor',
    'Status',
    ]

    const lines = rows.map(row => {
      const sectionRow = row.section_id ? sectionLookup.get(row.section_id) ?? null : null
      const schedule = formatSchedule(row)
      const units = typeof row.units === 'number' ? row.units : ''
      const status = classStatus(row)
      const instructor = row.instructor ?? sectionRow?.instructor ?? ''
      const room = row.room ?? sectionRow?.room ?? ''
      const sectionNumber = sectionRow?.section_number ?? ''

      return [
        row.title ?? '',
        row.code ?? '',
        buildSectionLabel(sectionRow),
        sectionNumber,
        schedule,
        units,
        room,
        instructor,
        status,
      ]
    })

    const csv = [header, ...lines]
      .map(row => row.map(escapeCsv).join(','))
      .join('\r\n')

    const now = new Date()
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`

    const res = new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="classes-export-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    })

    return res
  } catch (e: unknown) {
    const status = extractStatus(e)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'You do not have access to this resource.' }, 403)
    }

    const msg = logErr('/api/classes/export GET', e, { method: req.method })
    await auditError('system', 'classes', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}
