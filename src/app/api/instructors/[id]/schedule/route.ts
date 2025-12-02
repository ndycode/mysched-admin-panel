import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/authz'
import { audit, auditError } from '@/lib/audit'
import { extractStatus, validationDetails } from '@/lib/api-error'
import { assertSameOrigin } from '@/lib/csrf'
import { createHttpError } from '@/lib/http-error'
import { logErr } from '@/lib/log'
import { getClientIp } from '@/lib/request'
import { sbService } from '@/lib/supabase-service'
import { throttle } from '@/lib/rate'

const InstructorIdSchema = z.string().uuid('Invalid instructor id.')

const ClassIdSchema = z.object({
  classId: z.coerce.number().int().positive('Class id must be greater than zero.'),
})

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

type Params = { id: string }

type InstructorRow = {
  id: string
  full_name: string | null
  department: string | null
  email: string | null
  avatar_url: string | null
}

type ScheduleRow = {
  class_id: number
  code: string | null
  title: string | null
  units: number | null
  day: string | number | null
  start: string | null
  end: string | null
  room: string | null
  section_id: number | null
}

function mapDatabaseError(error: unknown): { status: number; message: string } | null {
  if (!error || typeof error !== 'object') return null
  const code = (error as { code?: string | null }).code ?? null
  const details = (error as { details?: string | null }).details ?? ''
  switch (code) {
    case '23503':
      if (details.includes('classes_instructor_id_fkey')) {
        return { status: 422, message: 'Instructor does not exist.' }
      }
      if (details.includes('classes_section_id_fkey')) {
        return { status: 422, message: 'Section does not exist.' }
      }
      return { status: 422, message: 'Related record not found.' }
    case '23505':
      return { status: 409, message: 'Duplicate class assignment detected.' }
    default:
      return null
  }
}

async function fetchInstructor(id: string) {
  const sb = sbService()
  const { data, error } = await sb
    .from('instructors')
    .select('id, full_name, department, email, avatar_url')
    .eq('id', id)
    .maybeSingle<InstructorRow>()

  if (error) {
    throw createHttpError(500, 'Failed to load instructor.', error)
  }

  return data
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    await requireAdmin()
    const { id } = await context.params
    const parsed = InstructorIdSchema.safeParse(id)
    if (!parsed.success) {
      return json({ error: 'Invalid instructor id.' }, 400)
    }

    const instructor = await fetchInstructor(parsed.data)
    if (!instructor) {
      return json({ error: 'Instructor not found.' }, 404)
    }

    const sb = sbService()
    const { data, error } = await sb.rpc('get_instructor_schedule', {
      p_instructor_id: parsed.data,
    })

    if (error) {
      throw createHttpError(500, 'Failed to load instructor schedule.', error)
    }

    return json({ instructor, classes: (data ?? []) as ScheduleRow[] })
  } catch (e) {
    const status = extractStatus(e)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'You do not have access to this resource.' }, 403)
    }

    const msg = logErr('/api/instructors/[id]/schedule GET', e, { method: req.method })
    await auditError('system', 'instructors', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    const { id } = await context.params
    const parsedId = InstructorIdSchema.safeParse(id)
    if (!parsedId.success) {
      return json({ error: 'Invalid instructor id.' }, 400)
    }

    const body = await req.json()
    const { classId } = ClassIdSchema.parse(body)

    const instructor = await fetchInstructor(parsedId.data)
    if (!instructor) {
      return json({ error: 'Instructor not found.' }, 404)
    }

    const sb = sbService()
    const { error } = await sb.rpc('assign_class_to_instructor', {
      p_class_id: classId,
      p_instructor_id: parsedId.data,
    })

    if (error) {
      throw createHttpError(500, 'Failed to assign class to instructor.', error)
    }

    await audit(admin.id, 'classes', 'update', classId, {
      details: {
        instructor_id: parsedId.data,
        action: 'assign',
      },
    })

    return json({ ok: true, classId, instructorId: parsedId.data })
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

    const msg = logErr('/api/instructors/[id]/schedule POST', e, { method: req.method })
    await auditError('system', 'classes', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    const { id } = await context.params
    const parsedId = InstructorIdSchema.safeParse(id)
    if (!parsedId.success) {
      return json({ error: 'Invalid instructor id.' }, 400)
    }

    const body = await req.json()
    const { classId } = ClassIdSchema.parse(body)

    const instructor = await fetchInstructor(parsedId.data)
    if (!instructor) {
      return json({ error: 'Instructor not found.' }, 404)
    }

    const sb = sbService()

    const update = await sb
      .from('classes')
      .update({
        instructor_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', classId)
      .eq('instructor_id', parsedId.data)
      .select('id')

    if (update.error) {
      const mapped = mapDatabaseError(update.error)
      if (mapped) {
        await auditError(admin.id, 'classes', mapped.message, {
          instructor_id: parsedId.data,
          class_id: classId,
          error: update.error,
        })
        return json({ error: mapped.message }, mapped.status)
      }

      await auditError(admin.id, 'classes', 'Failed to unassign class.', {
        instructor_id: parsedId.data,
        class_id: classId,
        error: update.error,
      })
      return json({ error: 'Failed to unassign class.' }, 500)
    }

    const unassigned = update.data ?? []
    if (unassigned.length === 0) {
      return json({ error: 'Class not found or already unassigned.' }, 404)
    }

    await audit(admin.id, 'classes', 'update', classId, {
      details: {
        instructor_id: parsedId.data,
        action: 'unassign',
      },
    })

    return json({ ok: true, classId })
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

    const msg = logErr('/api/instructors/[id]/schedule DELETE', e, { method: req.method })
    await auditError('system', 'classes', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<Params> },
) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    const { id } = await context.params
    const parsedId = InstructorIdSchema.safeParse(id)
    if (!parsedId.success) {
      return json({ error: 'Invalid instructor id.' }, 400)
    }

    const body = await req.json()
    const { classId } = ClassIdSchema.parse(body)

    const instructor = await fetchInstructor(parsedId.data)
    if (!instructor) {
      return json({ error: 'Instructor not found.' }, 404)
    }

    const sb = sbService()
    const { error } = await sb.rpc('archive_class', {
      p_class_id: classId,
    })

    if (error) {
      throw createHttpError(500, 'Failed to archive class.', error)
    }

    await audit(admin.id, 'classes', 'update', classId, {
      details: {
        instructor_id: parsedId.data,
        action: 'archive',
      },
    })

    return json({ ok: true, classId })
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

    const msg = logErr('/api/instructors/[id]/schedule PATCH', e, { method: req.method })
    await auditError('system', 'classes', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}
