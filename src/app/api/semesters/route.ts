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

const SemesterCreateSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(40, 'Max 40 characters'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Max 100 characters'),
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
    const activeOnly = sp.get('active') === 'true'

    let query = sb
      .from('semesters')
      .select('*')
      .order('is_active', { ascending: false })
      .order('start_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query
    if (error) {
      const mapped = mapDatabaseError(error)
      if (mapped) return json({ error: mapped.message }, mapped.status)
      throw createHttpError(500, 'Failed to load semesters', error)
    }

    return json(data ?? [])
  } catch (e) {
    const status = extractStatus(e)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'You do not have access to this resource.' }, 403)
    }
    const msg = logErr('/api/semesters GET', e, { method: req.method })
    await auditError('system', 'semesters', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    const input = SemesterCreateSchema.parse(await req.json())

    const payload = {
      code: input.code.trim(),
      name: input.name.trim(),
      academic_year: input.academic_year?.trim() || null,
      term: input.term ?? null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      is_active: input.is_active ?? false,
    }

    const sb = sbService()
    const { data, error } = await sb
      .from('semesters')
      .insert(payload)
      .select()
      .single()

    if (error) {
      const mapped = mapDatabaseError(error)
      if (mapped) return json({ error: mapped.message }, mapped.status)
      throw createHttpError(500, 'Failed to create semester', error)
    }

    await audit(admin.id, 'semesters', 'insert', String((data as { id: number }).id), { details: payload })
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

    const msg = logErr('/api/semesters POST', e, { method: req.method })
    await auditError('system', 'semesters', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}
