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
import type { PostgrestError } from '@supabase/supabase-js'

import { canonicalDay } from '@/lib/days'
import { dayDbVariants, isDayColumnError } from '@/lib/day-storage'

import { ClassPatchSchema } from '../schemas'

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

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

type P = { id: string };

export async function GET(
  req: NextRequest,
  context: { params: Promise<P> },
): Promise<ReturnType<typeof json>> {
  try {
    await requireAdmin()
    const { id } = await context.params
    const idNum = Number(id)
    const sb = sbService()
    const { data, error } = await sb
      .from('classes')
      .select('*, instructor_profile:instructor_id(id, full_name, email, title, department, avatar_url)')
      .eq('id', idNum)
      .maybeSingle()

    if (error) {
      if ((error as { code?: string } | null)?.code === 'PGRST116') {
        return json({ error: 'Class not found.' }, 404)
      }
      throw createHttpError(500, 'Failed to load class', error)
    }

    if (!data) {
      return json({ error: 'Class not found.' }, 404)
    }

    let section: Record<string, unknown> | null = null
    if (data.section_id) {
      const { data: sectionRow, error: sectionError } = await sb
        .from('sections')
        .select(
          'id, code, section_number, class_code, class_name, instructor, time_slot, room, enrolled, capacity, status',
        )
        .eq('id', data.section_id)
        .maybeSingle()

      if (!sectionError && sectionRow) {
        section = sectionRow
      }
    }

    const normalizedDay = canonicalDay((data as { day?: unknown }).day)
    const instructorProfile = (data as { instructor_profile?: unknown }).instructor_profile as
      | {
        id: string
        full_name: string | null
        email: string | null
        title: string | null
        department: string | null
        avatar_url: string | null
      }
      | null
      | undefined
    const instructorName = instructorProfile?.full_name ?? (data as { instructor?: string | null }).instructor ?? null
    return json({
      ...data,
      instructor: instructorName,
      day: normalizedDay ?? null,
      section,
    })
  } catch (e: unknown) {
    const status = extractStatus(e)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'You do not have access to this resource.' }, 403)
    }

    const msg = logErr('/api/classes/[id] GET', e, { method: req.method })
    await auditError('system', 'classes', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<P> }
): Promise<ReturnType<typeof json>> {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const user = await requireAdmin()
    const { id } = await context.params
    const idNum = Number(id)
    const sb = sbService()

    // Load current row up front for comparison + consistent return shape
    const { data: existingRow, error: lookupError } = await sb
      .from('classes')
      .select('*, instructor_profile:instructor_id(id, full_name, email, title, department, avatar_url)')
      .eq('id', idNum)
      .maybeSingle()

    if (lookupError) {
      if ((lookupError as { code?: string } | null)?.code === 'PGRST116') {
        return json({ error: 'Class not found.' }, 404)
      }
      throw createHttpError(500, 'Failed to load class', lookupError)
    }

    if (!existingRow) {
      return json({ error: 'Class not found.' }, 404)
    }

    const patchInput = ClassPatchSchema.parse(await req.json())
    const basePatch: Record<string, unknown> = { ...patchInput }
    if (Object.prototype.hasOwnProperty.call(basePatch, 'instructor')) {
      delete basePatch.instructor
    }
    if (Object.prototype.hasOwnProperty.call(basePatch, 'instructor_id')) {
      basePatch.instructor_id = patchInput.instructor_id ?? null
    }
    let dayVariants: Array<string | number | null> | null = null

    if (Object.prototype.hasOwnProperty.call(patchInput, 'day')) {
      const value = patchInput.day
      delete basePatch.day
      if (value === null) {
        dayVariants = [null]
      } else {
        const variants = dayDbVariants(value)
        if (variants.length === 0) {
          return json({ error: 'Invalid day value.' }, 422)
        }
        dayVariants = variants as Array<string | number>
      }
    }

    const compareTarget: Record<string, unknown> = { ...basePatch }
    if (Object.prototype.hasOwnProperty.call(patchInput, 'day')) {
      compareTarget.day = canonicalDay(patchInput.day) ?? patchInput.day ?? null
    }

    const isNoop =
      Object.keys(compareTarget).length === 0 ||
      Object.entries(compareTarget).every(([key, value]) => {
        if (key === 'day') {
          const existingDay = canonicalDay((existingRow as { day?: unknown }).day) ?? (existingRow as { day?: unknown }).day ?? null
          return (existingDay ?? null) === (value ?? null)
        }
        const existingValue = (existingRow as Record<string, unknown>)[key]
        return (existingValue ?? null) === (value ?? null)
      })

    if (isNoop) {
      const normalizedDay = canonicalDay((existingRow as { day?: unknown }).day) ?? null
      const instructorProfile = (existingRow as { instructor_profile?: unknown }).instructor_profile as
        | {
          id: string
          full_name: string | null
          email: string | null
          title: string | null
          department: string | null
          avatar_url: string | null
        }
        | null
        | undefined
      const instructorName = instructorProfile?.full_name ?? (existingRow as { instructor?: string | null }).instructor ?? null
      return json({
        ...existingRow,
        instructor: instructorName,
        day: normalizedDay,
      })
    }

    const attempts = dayVariants ? [...dayVariants] : [undefined]
    let updatedData: Record<string, unknown> | null = null
    let finalPatch: Record<string, unknown> | null = null
    let lastError: PostgrestError | null = null

    for (const variant of attempts) {
      const attemptPatch: Record<string, unknown> = { ...basePatch }
      if (typeof variant !== 'undefined') {
        attemptPatch.day = variant
      }

      const { data, error } = await sb
        .from('classes')
        .update(attemptPatch)
        .eq('id', idNum)
        .select('*, instructor_profile:instructor_id(id, full_name, email, title, department, avatar_url)')
        .single()

      if (!error) {
        updatedData = (data ?? null) as Record<string, unknown> | null
        finalPatch = attemptPatch
        lastError = null
        break
      }

      lastError = error
      if (!dayVariants || !isDayColumnError(error)) {
        break
      }
    }

    if (!updatedData) {
      if (lastError) {
        const mapped = mapDatabaseError(lastError)
        if (mapped) return json({ error: mapped.message }, mapped.status)
      }
      throw createHttpError(500, 'Failed to update class', lastError ?? undefined)
    }

    const auditPayload = finalPatch ?? basePatch
    await audit(user.id, 'classes', 'update', idNum, { details: auditPayload })
    return json(updatedData)
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

    const msg = logErr('/api/classes/[id] PATCH', e, { method: req.method })
    await auditError('system', 'classes', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<P> }
): Promise<ReturnType<typeof json>> {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const user = await requireAdmin()
    const { id } = await context.params
    const idNum = Number(id)
    const sb = sbService()
    const { data: existing, error: lookupError } = await sb
      .from('classes')
      .select()
      .eq('id', idNum)
      .maybeSingle()
    if (lookupError) {
      throw createHttpError(500, 'Failed to load class', lookupError)
    }
    if (!existing) {
      return json({ error: 'Class not found.' }, 404)
    }

    const { error } = await sb.from('classes').delete().eq('id', idNum)
    if (error) {
      const mapped = mapDatabaseError(error)
      if (mapped) {
        await auditError(user.id, 'classes', mapped.message, {
          class_id: idNum,
          error,
        })
        return json({ error: mapped.message }, mapped.status)
      }
      await auditError(user.id, 'classes', 'Failed to delete class', {
        class_id: idNum,
        error,
      })
      return json({ error: 'Failed to delete class' }, 500)
    }
    await audit(user.id, 'classes', 'delete', idNum, { before: existing })
    return json({ ok: true })
  } catch (e: unknown) {
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

    const msg = logErr('/api/classes/[id] DELETE', e, { method: req.method })
    await auditError('system', 'classes', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}
