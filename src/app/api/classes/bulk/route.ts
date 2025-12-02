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

import { dayDbVariants, isDayColumnError } from '@/lib/day-storage'

import { ClassIdArraySchema, ClassPatchSchema } from '../schemas'

type UpdatedClassRow = { id: number } & Record<string, unknown>

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

const BulkPatchSchema = z.object({
  ids: ClassIdArraySchema,
  values: ClassPatchSchema,
})

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
      return { status: 422, message: 'Related record not found.' }
    default:
      return null
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    const payload = BulkPatchSchema.parse(await req.json())

    const ids = Array.from(new Set(payload.ids))
    const values = payload.values
    const baseValues: Record<string, unknown> = { ...values }
    let dayVariants: Array<string | number | null> | null = null

    if (Object.prototype.hasOwnProperty.call(values, 'day')) {
      const value = values.day
      delete baseValues.day
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

    const sb = sbService()
    const attempts = dayVariants ? [...dayVariants] : [undefined]
    let updatedRows: UpdatedClassRow[] = []
    let appliedValues: Record<string, unknown> | null = null
    let lastError: PostgrestError | null = null

    for (const variant of attempts) {
      const attemptValues: Record<string, unknown> = { ...baseValues }
      if (typeof variant !== 'undefined') {
        attemptValues.day = variant
      }

      const { data, error } = await sb.from('classes').update(attemptValues).in('id', ids).select()

      if (!error) {
        updatedRows = (data ?? []) as UpdatedClassRow[]
        appliedValues = attemptValues
        lastError = null
        break
      }

      lastError = error
      if (!dayVariants || !isDayColumnError(error)) {
        break
      }
    }

    if (!appliedValues) {
      if (lastError) {
        const mapped = mapDatabaseError(lastError)
        if (mapped) return json({ error: mapped.message }, mapped.status)
      }
      throw createHttpError(500, 'Failed to update classes', lastError ?? undefined)
    }

    await Promise.all(
      updatedRows.map(row =>
        audit(admin.id, 'classes', 'update', row.id, {
          details: appliedValues,
        }),
      ),
    )

    return json({ rows: updatedRows, count: updatedRows.length })
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

    const msg = logErr('/api/classes/bulk PATCH', e, { method: req.method })
    await auditError('system', 'classes', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

export const dynamic = 'force-dynamic'
