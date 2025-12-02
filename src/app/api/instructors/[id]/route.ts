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

const InstructorPatchSchema = z
  .object({
    full_name: z.string().trim().min(1, 'Full name is required').max(160, 'Max 160 characters').optional(),
    email: z.string().trim().email('Invalid email address').max(320).nullable().optional(),
    title: z.string().trim().max(120).nullable().optional(),
    department: z.string().trim().max(160).nullable().optional(),
    avatar_url: z.string().trim().url('Avatar URL must be valid').max(2048).nullable().optional(),
  })
  .strict()

function trimOrNull(value: string | null | undefined) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

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
      return { status: 409, message: 'An instructor with this information already exists.' }
    case '23503':
      return { status: 409, message: 'Instructor is linked to other records and cannot be removed.' }
    default:
      return null
  }
}

type Params = { id: string }

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    const { id } = await context.params
    const input = InstructorPatchSchema.parse(await req.json())

    const patch: Record<string, unknown> = {}
    if (Object.prototype.hasOwnProperty.call(input, 'full_name')) {
      const value = input.full_name
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) {
          return json({ error: 'Full name cannot be empty.' }, 422)
        }
        patch.full_name = trimmed
      }
    }
    if (Object.prototype.hasOwnProperty.call(input, 'email')) {
      patch.email = trimOrNull(input.email ?? null)
    }
    if (Object.prototype.hasOwnProperty.call(input, 'title')) {
      patch.title = trimOrNull(input.title ?? null)
    }
    if (Object.prototype.hasOwnProperty.call(input, 'department')) {
      patch.department = trimOrNull(input.department ?? null)
    }
    if (Object.prototype.hasOwnProperty.call(input, 'avatar_url')) {
      patch.avatar_url = trimOrNull(input.avatar_url ?? null)
    }

    if (Object.keys(patch).length === 0) {
      return json({ error: 'No changes provided.' }, 400)
    }

    const sb = sbService()
    const { data, error } = await sb
      .from('instructors')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      const mapped = mapDatabaseError(error)
      if (mapped) return json({ error: mapped.message }, mapped.status)
      throw createHttpError(500, 'Failed to update instructor', error)
    }

    await audit(admin.id, 'instructors', 'update', id, { details: patch })
    return json(data)
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

    const msg = logErr('/api/instructors/[id] PATCH', e, { method: req.method })
    await auditError('system', 'instructors', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<Params> },
) {
  let adminId: string | null = null
  let instructorId: string | null = null
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    adminId = admin.id
    const { id } = await context.params
    instructorId = id
    const sb = sbService()
    const { data: existing, error: lookupError } = await sb.from('instructors').select().eq('id', id).maybeSingle()
    if (lookupError) {
      throw createHttpError(500, 'Failed to load instructor', lookupError)
    }
    if (!existing) {
      return json({ error: 'Instructor not found.' }, 404)
    }

    const { error } = await sb.from('instructors').delete().eq('id', id)
    if (error) {
      const mapped = mapDatabaseError(error)
      if (mapped) {
        await auditError(adminId, 'instructors', mapped.message, { instructor_id: id, error })
        return json({ error: mapped.message }, mapped.status)
      }
      await auditError(adminId, 'instructors', 'Failed to delete instructor', {
        instructor_id: id,
        error,
      })
      return json({ error: 'Failed to delete instructor' }, 500)
    }

    await audit(adminId, 'instructors', 'delete', id, { before: existing })
    return json({ ok: true }, 200)
  } catch (e) {
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

    const msg = logErr('/api/instructors/[id] DELETE', e, { method: req.method })
    await auditError(adminId ?? 'system', 'instructors', msg, {
      instructor_id: instructorId ?? undefined,
    })
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}
