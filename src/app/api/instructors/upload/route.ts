import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

import { requireAdmin } from '@/lib/authz'
import { audit, auditError } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/csrf'
import { extractStatus } from '@/lib/api-error'
import { logErr } from '@/lib/log'
import { getClientIp } from '@/lib/request'
import { sbService } from '@/lib/supabase-service'
import { throttle } from '@/lib/rate'
import { createHttpError } from '@/lib/http-error'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

function normalizeSegment(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function slugFromName(name: string | null | undefined) {
  if (!name) return null
  const trimmed = name.trim()
  if (!trimmed) return null
  const parts = trimmed.split(/\s+/)
  if (parts.length === 0) return null
  const first = parts[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1] ?? '' : ''
  const segments = [last, first].filter(Boolean).map(normalizeSegment).filter(Boolean)
  if (segments.length === 0) {
    const fallback = normalizeSegment(trimmed)
    return fallback || null
  }
  return segments.join('_')
}

function slugFromFilename(filename: string) {
  if (!filename) return null
  const base = filename.includes('.') ? filename.slice(0, filename.lastIndexOf('.')) : filename
  const normalized = normalizeSegment(base)
  return normalized || null
}

function buildObjectName(name: string | null | undefined, filename: string) {
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStamp = `${year}${month}${day}`
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const timeStamp = `${hours}${minutes}${seconds}`
  const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.') + 1).toLowerCase() : ''
  const nameSlug = slugFromName(name) ?? slugFromFilename(filename) ?? randomUUID()
  const composed = `${nameSlug}_${dateStamp}_${timeStamp}`
  return `${composed}${ext ? `.${ext}` : ''}`
}

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

export async function POST(req: NextRequest) {
  let adminId: string | null = null
  let attemptedFile: { name?: string; size?: number; type?: string } | null = null
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    const admin = await requireAdmin()
    adminId = admin.id

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return json({ error: 'No file uploaded.' }, 400)
    }
    if (file.size === 0) {
      return json({ error: 'Uploaded file is empty.' }, 400)
    }
    if (file.size > MAX_FILE_SIZE) {
      return json({ error: 'File exceeds the 5MB size limit.' }, 413)
    }

    attemptedFile = { name: file.name, size: file.size, type: file.type }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const sb = sbService()
    const objectName = buildObjectName(
      (formData.get('name') as string | null) ?? undefined,
      file.name,
    )

    const { error } = await sb.storage
      .from('instructors')
      .upload(objectName, buffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false,
      })
    if (error) {
      throw createHttpError(500, 'Failed to upload avatar', error)
    }

    const { data } = sb.storage.from('instructors').getPublicUrl(objectName)
    await audit(adminId, 'instructors', 'insert', objectName, {
      details: {
        path: objectName,
        url: data.publicUrl,
        ...attemptedFile,
      },
    })
    return json({ path: objectName, url: data.publicUrl })
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

    const msg = logErr('/api/instructors/upload POST', e, { method: req.method })
    await auditError(adminId ?? 'system', 'instructors', msg, {
      file: attemptedFile ?? undefined,
    })
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}
