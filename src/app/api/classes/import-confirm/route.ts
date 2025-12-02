import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/authz'
import { audit, auditError } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/csrf'
import { extractStatus, validationDetails } from '@/lib/api-error'
import { createHttpError } from '@/lib/http-error'
import { logErr } from '@/lib/log'
import { parseUnitsValue, toDowValue } from '@/lib/schedule-import'
import { resolveTimeRange } from '@/lib/time-range'
import { getClientIp } from '@/lib/request'
import { sbService } from '@/lib/supabase-service'
import { throttle } from '@/lib/rate'

import { ClassCreateSchema } from '../schemas'
import type { PostgrestError } from '@supabase/supabase-js'

const ConfirmClassSchema = z
  .object({
    day: z.string().optional().nullable(),
    time_range: z.string().optional().nullable(),
    time: z.string().optional().nullable(),
    start: z.string().optional().nullable(),
    end: z.string().optional().nullable(),
    code: z.string().trim().min(1, 'Code is required'),
    title: z.string().trim().min(1, 'Title is required'),
    units: z.union([z.number(), z.string()]).optional().nullable(),
    room: z.string().optional().nullable(),
    instructor_id: z.string().uuid().optional().nullable(),
  })
  .passthrough()

const ConfirmPayloadSchema = z
  .object({
    section_id: z.coerce.number().int().positive('Section id must be greater than 0'),
    classes: z.array(ConfirmClassSchema).min(1, 'At least one class is required'),
  })
  .strict()

type InsertRow = z.infer<typeof ClassCreateSchema>

type ValidationIssue = z.ZodIssue

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
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

function normalizeRoom(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function deriveTimeRange(row: z.infer<typeof ConfirmClassSchema>) {
  const range = resolveTimeRange({
    start: row.start ?? null,
    end: row.end ?? null,
    range: row.time_range ?? row.time ?? null,
  })
  if (!range) {
    return null
  }
  return range
}

export async function POST(req: NextRequest) {
  try {
    await throttle(getClientIp(req), { windowMs: 60_000, limit: 10 })
    assertSameOrigin(req)
    const admin = await requireAdmin()

    const parsed = ConfirmPayloadSchema.parse(await req.json())

    const sb = sbService()
    const { data: sectionRow, error: sectionError } = await sb
      .from('sections')
      .select('id')
      .eq('id', parsed.section_id)
      .maybeSingle()

    if (sectionError) {
      throw createHttpError(500, 'section_lookup_failed', sectionError)
    }
    if (!sectionRow) {
      return json({ error: 'Section not found.' }, 404)
    }

    const issues: ValidationIssue[] = []
    const rows: InsertRow[] = []

  parsed.classes.forEach((row, index) => {
    const dayInfo = toDowValue(row.day ?? null)
    if (!dayInfo.code) {
      issues.push({
        code: z.ZodIssueCode.custom,
          message: 'Unrecognized day value. Please specify a valid day of week.',
          path: ['classes', index, 'day'],
        })
        return
      }

      const range = deriveTimeRange(row)
      if (!range) {
        issues.push({
          code: z.ZodIssueCode.custom,
          message: 'Time range is invalid. Provide a start and end time.',
          path: ['classes', index, 'time_range'],
        })
        return
      }

      const unitsResult = parseUnitsValue(row.units)
      if (unitsResult.warning) {
        issues.push({
          code: z.ZodIssueCode.custom,
          message: unitsResult.warning,
          path: ['classes', index, 'units'],
        })
        return
      }

      const payload = {
        title: row.title.trim(),
        code: row.code.trim(),
        section_id: parsed.section_id,
        day: dayInfo.code,
        start: range.start,
        end: range.end,
        units: unitsResult.value,
        room: normalizeRoom(row.room),
        instructor_id: row.instructor_id ?? null,
      }

      const validation = ClassCreateSchema.safeParse(payload)
      if (!validation.success) {
        validation.error.issues.forEach(issue =>
          issues.push({
            ...issue,
            path: ['classes', index, ...issue.path],
          }),
        )
        return
      }

      rows.push(validation.data)
    })

    if (issues.length > 0) {
      return json({ error: 'One or more rows are invalid.', issues }, 422)
    }

    const { data, error } = await sb
      .from('classes')
      .insert(rows)
      .select('id, section_id, code, title, day, start, end, units, room')

    if (error) {
      const mapped = mapDatabaseError(error)
      if (mapped) {
        return json({ error: mapped.message, code: error.code, details: error.details, hint: error.hint }, mapped.status)
      }
      return json(
        {
          error: error.message || 'Failed to import classes',
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        500,
      )
    }

    const inserted = data ?? []
    await Promise.all(
      inserted.map(async (row, idx) => {
        await audit(admin.id, 'classes', 'insert', row.id, {
          details: rows[idx],
        })
      }),
    )

    return json({ section_id: parsed.section_id, count: inserted.length, rows: inserted })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { message, issues } = validationDetails(error)
      return json({ error: message, issues }, 422)
    }

    const status = extractStatus(error)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'Request origin is not allowed.' }, 403)
    }
    if (status === 404) {
      return json({ error: 'Section not found.' }, 404)
    }
  if (status === 422) {
    const message = (error as Error).message || 'Invalid request payload.'
    return json({ error: message }, 422)
  }
  if (status === 429) {
    return json({ error: 'Too many requests. Please wait and try again.' }, 429)
  }

  const pg = error as PostgrestError
  const extras =
    pg && typeof pg === 'object'
      ? {
          code: (pg as { code?: string | null }).code,
          details: (pg as { details?: string | null }).details,
          hint: (pg as { hint?: string | null }).hint,
          message: (pg as { message?: string | null }).message,
        }
      : {}

  const msg = logErr('/api/classes/import-confirm POST', error, { method: req.method, ...extras })
  await auditError('system', 'classes', msg, { route: 'import-confirm', ...extras })
  return json(
    {
      error: msg || 'Internal Server Error',
      ...extras,
    },
    500,
  )
}
}
