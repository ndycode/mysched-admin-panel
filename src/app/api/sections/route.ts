// src/app/api/sections/route.ts
// create index if not exists idx_sections_code on sections(lower(code));

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

const SectionSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(40, 'Max 40 characters'),
  semester_id: z.coerce.number().int().positive().optional(),
}).strict()

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

function mapDatabaseError(error: unknown): { status: number; message: string } | null {
  if (!error || typeof error !== 'object') return null
  const code = (error as { code?: string | null }).code
  switch (code) {
    case '23505':
      return { status: 409, message: 'Section code already exists.' }
    case '23503':
      return { status: 422, message: 'Related record not found.' }
    default:
      return null
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const sb = sbService()
    const sp = new URL(req.url).searchParams
    const instructorId = sp.get('instructor_id')
    const semesterId = sp.get('semester_id')

    let allowedSectionIds: number[] | null = null
    if (instructorId && instructorId !== 'all') {
      const { data: instructorClasses, error: instructorClassesError } = await sb
        .from('classes')
        .select('section_id')
        .eq('instructor_id', instructorId)
        .is('archived_at', null)

      if (instructorClassesError) {
        throw createHttpError(500, 'Failed to filter sections by instructor', instructorClassesError)
      }

      const ids = (instructorClasses ?? [])
        .map(row => row.section_id)
        .filter((value): value is number => typeof value === 'number')
      const unique = Array.from(new Set(ids))
      if (unique.length === 0) {
        return json([])
      }
      allowedSectionIds = unique
    }

    let sectionsQuery = sb.from('sections').select('id, code, section_number, semester_id, created_at, updated_at, semesters(id, code, name, is_active)')

    // Filter by semester
    if (semesterId && semesterId !== 'all') {
      sectionsQuery = sectionsQuery.eq('semester_id', Number(semesterId))
    }

    if (allowedSectionIds) {
      sectionsQuery = sectionsQuery.in('id', allowedSectionIds)
    }

    const { data: sections, error: sectionError } = await sectionsQuery.order('code')
    if (sectionError) {
      const mapped = mapDatabaseError(sectionError)
      if (mapped) return json({ error: mapped.message }, mapped.status)
      console.error('[sections] list failed, returning empty fallback', sectionError)
      return json([], 200)
    }

    let classesQuery = sb.from('classes').select('id, section_id').is('archived_at', null)
    if (allowedSectionIds) {
      classesQuery = classesQuery.in('section_id', allowedSectionIds)
    }
    if (instructorId && instructorId !== 'all') {
      classesQuery = classesQuery.eq('instructor_id', instructorId)
    }
    const { data: classRows, error: classError } = await classesQuery
    const safeClassRows = classError ? [] : classRows ?? []
    if (classError) console.error('[sections] class count failed (using zero fallback)', classError)

    const countBySection = new Map<number, number>()
    for (const row of safeClassRows) {
      if (typeof row.section_id !== 'number') continue
      countBySection.set(row.section_id, (countBySection.get(row.section_id) ?? 0) + 1)
    }

    const withCounts = (sections ?? []).map(section => ({
      ...section,
      class_count: countBySection.get(section.id ?? -1) ?? 0,
    }))

    return json(withCounts)
  } catch (e) {
    const status = extractStatus(e)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'You do not have access to this resource.' }, 403)
    }
    const msg = logErr('/api/sections GET', e, {})
    await auditError('system', 'sections', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function POST(
  req: NextRequest
): Promise<ReturnType<typeof json>> {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()

    const input = SectionSchema.parse(await req.json())
    const normalizedCode = input.code.trim().replace(/\s+/g, ' ').toUpperCase()
    const sb = sbService()

    // Use provided semester_id, or fall back to active semester
    let finalSemesterId: number | null = input.semester_id ?? null
    if (!finalSemesterId) {
      const { data: activeSemester } = await sb
        .from('semesters')
        .select('id')
        .eq('is_active', true)
        .single()
      finalSemesterId = activeSemester?.id ?? null
    }

    const { data, error } = await sb
      .from('sections')
      .insert({
        code: normalizedCode,
        semester_id: finalSemesterId,
      })
      .select()
      .single()
    if (error) {
      const mapped = mapDatabaseError(error)
      if (mapped) return json({ error: mapped.message }, mapped.status)
      throw createHttpError(500, 'Failed to create section', error)
    }

    await audit(admin.id, 'sections', 'insert', data.id, { details: input })
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

    const msg = logErr('/api/sections POST', e, { method: req.method })
    await auditError('system', 'sections', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function PATCH() {
  return json({ error: 'Use /api/sections/[id] for updates' }, 405)
}
