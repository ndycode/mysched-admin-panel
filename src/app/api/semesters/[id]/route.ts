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

const SemesterUpdateSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(40, 'Max 40 characters').optional(),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Max 100 characters').optional(),
  academic_year: z.string().trim().max(20).nullable().optional(),
  term: z.number().int().min(1).max(3).nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
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
      return { status: 409, message: 'Semester code already exists.' }
    case '23503':
      return { status: 422, message: 'Cannot delete: semester has sections linked to it.' }
    default:
      return null
  }
}

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    const semesterId = parseInt(id, 10)
    if (isNaN(semesterId)) {
      return json({ error: 'Invalid semester ID' }, 400)
    }

    const sb = sbService()
    const { data, error } = await sb
      .from('semesters')
      .select('*')
      .eq('id', semesterId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return json({ error: 'Semester not found' }, 404)
      }
      throw createHttpError(500, 'Failed to load semester', error)
    }

    return json(data)
  } catch (e) {
    const status = extractStatus(e)
    if (status === 401) return json({ error: 'Authentication required.' }, 401)
    if (status === 403) return json({ error: 'Access denied.' }, 403)
    const msg = logErr('/api/semesters/[id] GET', e, { method: req.method })
    await auditError('system', 'semesters', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    const { id } = await ctx.params
    const semesterId = parseInt(id, 10)
    if (isNaN(semesterId)) {
      return json({ error: 'Invalid semester ID' }, 400)
    }

    const input = SemesterUpdateSchema.parse(await req.json())

    const sb = sbService()

    // Enforce single active semester: deactivate others when setting this one active
    if (input.is_active === true) {
      await sb
        .from('semesters')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .neq('id', semesterId)
        .eq('is_active', true)
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.code !== undefined) payload.code = input.code.trim()
    if (input.name !== undefined) payload.name = input.name.trim()
    if (input.academic_year !== undefined) payload.academic_year = input.academic_year?.trim() || null
    if (input.term !== undefined) payload.term = input.term
    if (input.start_date !== undefined) payload.start_date = input.start_date || null
    if (input.end_date !== undefined) payload.end_date = input.end_date || null
    if (input.is_active !== undefined) payload.is_active = input.is_active

    const { data, error } = await sb
      .from('semesters')
      .update(payload)
      .eq('id', semesterId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return json({ error: 'Semester not found' }, 404)
      }
      const mapped = mapDatabaseError(error)
      if (mapped) return json({ error: mapped.message }, mapped.status)
      throw createHttpError(500, 'Failed to update semester', error)
    }

    await audit(admin.id, 'semesters', 'update', id, { details: payload })
    return json(data)
  } catch (e) {
    if (e instanceof z.ZodError) {
      const { message, issues } = validationDetails(e)
      return json({ error: message, issues }, 422)
    }

    const status = extractStatus(e)
    if (status === 401) return json({ error: 'Authentication required.' }, 401)
    if (status === 403) return json({ error: 'Request origin is not allowed.' }, 403)
    if (status === 429) return json({ error: 'Too many requests. Please wait and try again.' }, 429)

    const msg = logErr('/api/semesters/[id] PATCH', e, { method: req.method })
    await auditError('system', 'semesters', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    const { id } = await ctx.params
    const semesterId = parseInt(id, 10)
    if (isNaN(semesterId)) {
      return json({ error: 'Invalid semester ID' }, 400)
    }

    const sb = sbService()

    // Check if semester has sections
    const { count: sectionCount } = await sb
      .from('sections')
      .select('id', { count: 'exact', head: true })
      .eq('semester_id', semesterId)

    if (sectionCount && sectionCount > 0) {
      return json({
        error: `Cannot delete semester: ${sectionCount} section(s) are linked to it. Remove or reassign sections first.`
      }, 409)
    }

    const { error } = await sb
      .from('semesters')
      .delete()
      .eq('id', semesterId)

    if (error) {
      const mapped = mapDatabaseError(error)
      if (mapped) return json({ error: mapped.message }, mapped.status)
      throw createHttpError(500, 'Failed to delete semester', error)
    }

    await audit(admin.id, 'semesters', 'delete', id, {})
    return json({ success: true })
  } catch (e) {
    const status = extractStatus(e)
    if (status === 401) return json({ error: 'Authentication required.' }, 401)
    if (status === 403) return json({ error: 'Request origin is not allowed.' }, 403)
    if (status === 429) return json({ error: 'Too many requests. Please wait and try again.' }, 429)

    const msg = logErr('/api/semesters/[id] DELETE', e, { method: req.method })
    await auditError('system', 'semesters', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}
