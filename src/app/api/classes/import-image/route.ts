import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/authz'
import { auditError } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/csrf'
import { extractStatus } from '@/lib/api-error'
import { createHttpError } from '@/lib/http-error'
import { logErr } from '@/lib/log'
import { detectScheduleFromImage } from '@/lib/ocr/schedule-ocr'
import { normalizeSectionCode, type SchedulePreviewRow } from '@/lib/schedule-import'
import { getClientIp } from '@/lib/request'
import { sbService } from '@/lib/supabase-service'
import { throttle } from '@/lib/rate'

const SectionIdSchema = z.coerce.number().int().positive()

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

type SectionSummary = { id: number; code: string | null }
type SectionLookupResult = { section: SectionSummary | null; message: string | null }
type InstructorSummary = { id: string; full_name: string }

type ImportPreviewResponse = {
  section: SectionSummary | null
  detectedSectionCode: string | null
  requiresSectionSelection: boolean
  message: string | null
  rows: SchedulePreviewRow[]
  warnings: string[]
}

function normalizeForMatch(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase()
}

async function findClosestSectionMatch(
  sb: ReturnType<typeof sbService>,
  detectedCode: string,
): Promise<SectionSummary | null> {
  // Lenient match to recover from OCR mistakes (e.g., dropped prefixes/suffixes).
  const normalizedDetected = normalizeForMatch(detectedCode)
  if (!normalizedDetected) return null

  const { data, error } = await sb.from('sections').select('id, code')
  if (error) {
    throw createHttpError(500, 'section_lookup_failed', error)
  }
  let best: { section: SectionSummary; distance: number; preferred: boolean } | null = null

  for (const entry of data ?? []) {
    if (!entry.code) continue
    const candidateNormalized = normalizeForMatch(entry.code)
    if (!candidateNormalized) continue

    const containsDetected =
      candidateNormalized.includes(normalizedDetected) || normalizedDetected.includes(candidateNormalized)
    if (containsDetected) {
      const diff = Math.abs(candidateNormalized.length - normalizedDetected.length)
      const allowedDiff = Math.max(1, Math.ceil(normalizedDetected.length * 0.34))
      if (diff <= allowedDiff) {
        if (!best || !best.preferred || diff < best.distance) {
          best = { section: { id: entry.id, code: entry.code }, distance: diff, preferred: true }
        }
        continue
      }
    }

  }

  return best?.section ?? null
}

function findClosestInstructorMatchInMemory(
  instructors: InstructorSummary[],
  detectedName: string,
): InstructorSummary | null {
  const normalizedDetected = normalizeForMatch(detectedName)
  if (!normalizedDetected) return null

  let best: { instructor: InstructorSummary; distance: number } | null = null

  for (const entry of instructors) {
    if (!entry.full_name) continue
    const candidateNormalized = normalizeForMatch(entry.full_name)
    if (!candidateNormalized) continue

    if (candidateNormalized.includes(normalizedDetected) || normalizedDetected.includes(candidateNormalized)) {
      const diff = Math.abs(candidateNormalized.length - normalizedDetected.length)
      // Allow a bit more fuzziness for names
      const allowedDiff = Math.max(2, Math.ceil(normalizedDetected.length * 0.4))

      if (diff <= allowedDiff) {
        if (!best || diff < best.distance) {
          best = { instructor: { id: entry.id, full_name: entry.full_name }, distance: diff }
        }
      }
    }
  }

  return best?.instructor ?? null
}

async function lookupSectionByCode(code: string, fallbackId?: number | null): Promise<SectionLookupResult> {
  const sb = sbService()
  const normalized = (normalizeSectionCode(code) ?? code).trim()
  const { data, error } = await sb
    .from('sections')
    .select('id, code')
    .ilike('code', normalized)
    .maybeSingle()
  if (error) {
    throw createHttpError(500, 'section_lookup_failed', error)
  }
  if (data) {
    return { section: { id: data.id, code: data.code }, message: null }
  }
  if (fallbackId) {
    return lookupSectionById(fallbackId)
  }

  const fuzzyMatch = await findClosestSectionMatch(sb, normalized)
  if (fuzzyMatch) {
    const matchedLabel = fuzzyMatch.code ?? `Section ${fuzzyMatch.id}`
    return {
      section: fuzzyMatch,
      message: `Matched detected code "${normalized}" to the closest section "${matchedLabel}".`,
    }
  }

  // Fallback if no match found
  return {
    section: null,
    message: `No section matched the detected code "${normalized}". A new section will be created.`,
  }
}

async function lookupSectionById(id: number): Promise<SectionLookupResult> {
  const sb = sbService()
  const { data, error } = await sb.from('sections').select('id, code').eq('id', id).maybeSingle()
  if (error) {
    throw createHttpError(500, 'section_lookup_failed', error)
  }
  if (!data) {
    return {
      section: null,
      message: `Section #${id} does not exist. Select a section manually.`,
    }
  }
  return { section: { id: data.id, code: data.code }, message: null }
}

function parseSectionId(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null
  const value = typeof raw === 'string' ? raw : raw.toString()
  if (!value.trim()) return null
  const parsed = SectionIdSchema.safeParse(value)
  if (!parsed.success) {
    throw createHttpError(422, 'invalid_section_id', 'Section id fallback must be a positive integer.')
  }
  return parsed.data
}

export async function POST(req: NextRequest) {
  try {
    await throttle(getClientIp(req), { windowMs: 60_000, limit: 12 })
    assertSameOrigin(req)
    await requireAdmin()

    const form = await req.formData()
    const file = form.get('image')
    if (!file || !(file instanceof Blob)) {
      return json({ error: 'Image file is required.' }, 422)
    }
    if (file.size === 0) {
      return json({ error: 'Uploaded image is empty.' }, 422)
    }

    let fallbackSectionId: number | null = null
    try {
      fallbackSectionId = parseSectionId(form.get('section_id'))
    } catch (error) {
      const status = extractStatus(error)
      if (status === 422) {
        return json({ error: (error as Error).message }, 422)
      }
      throw error
    }

    const result = await detectScheduleFromImage(file, { mimeType: file.type })

    let section: SectionSummary | null = null
    let message: string | null = null

    if (result.sectionCode) {
      const lookup = await lookupSectionByCode(result.sectionCode, fallbackSectionId)
      section = lookup.section
      message = lookup.message
    } else if (fallbackSectionId) {
      const lookup = await lookupSectionById(fallbackSectionId)
      section = lookup.section
      message = lookup.message
    }

    const requiresSectionSelection = !section
    if (requiresSectionSelection && !message) {
      message = 'No section was detected. Please choose a section before importing.'
    }

    // Detect instructor for each row
    const sb = sbService()

    // Fetch all instructors once for in-memory matching
    const { data: allInstructors } = await sb.from('instructors').select('id, full_name')

    if (allInstructors && allInstructors.length > 0) {
      for (const row of result.rows) {
        if (row.instructor_name) {
          const match = findClosestInstructorMatchInMemory(allInstructors, row.instructor_name)
          if (match) {
            row.matched_instructor = match
          }
        }
      }
    }

    const response: ImportPreviewResponse = {
      section,
      detectedSectionCode: result.sectionCode,
      requiresSectionSelection,
      message,
      rows: result.rows,
      warnings: result.warnings,
    }

    return json(response)
  } catch (error) {
    const status = extractStatus(error)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'Request origin is not allowed.' }, 403)
    }
    if (status === 422) {
      const message = (error as Error).message || 'Invalid request payload.'
      return json({ error: message }, 422)
    }
    if (status === 429) {
      return json({ error: 'Too many requests. Please try again later.' }, 429)
    }
    if (status === 500 && (error as { code?: string } | null)?.code === 'ocr_unavailable') {
      return json(
        {
          error: 'OCR is not configured. Please ask an administrator to set GEMINI_API_KEY on the server.',
        },
        500,
      )
    }
    if (status === 502 || status === 504) {
      const msg = logErr('/api/classes/import-image POST (ocr)', error, { method: req.method })
      return json(
        {
          error: msg || 'OCR service is temporarily unavailable. Please retry shortly.',
          detail: (error as { message?: string } | null)?.message,
        },
        status,
      )
    }

    const msg = logErr('/api/classes/import-image POST', error, { method: req.method })
    await auditError('system', 'classes', msg, { route: 'import-image' })
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}
