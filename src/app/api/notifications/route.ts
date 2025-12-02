import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/authz'
import { auditError } from '@/lib/audit'
import { extractStatus } from '@/lib/api-error'
import { logErr } from '@/lib/log'
import { sbService } from '@/lib/supabase-service'
import { createHttpError } from '@/lib/http-error'

type AuditRow = {
  id: number
  at: string | null
  created_at: string | null
  table_name: string | null
  action: string | null
  row_id: number | string | null
  details: unknown
}

type NotificationPayload = {
  id: number
  occurredAt: string | null
  table: string
  action: string
  rowId: number | string | null
  severity: 'info' | 'warning' | 'error'
  message: string
}

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

function deriveSeverity(action: string): NotificationPayload['severity'] {
  if (action === 'error') return 'error'
  if (action === 'delete') return 'warning'
  return 'info'
}

function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function fallbackMessage(row: AuditRow): string {
  const action = row.action ? titleCase(row.action) : 'Update'
  const scope = row.table_name ? titleCase(row.table_name) : 'record'
  if (row.row_id) {
    return `${action} on ${scope} #${row.row_id}`
  }
  return `${action} recorded in ${scope}`
}

function extractDetailsMessage(details: unknown): string | null {
  if (!details) return null
  if (typeof details === 'string') {
    return details
  }
  if (typeof details === 'object') {
    const maybe = (details as { message?: unknown }).message
    if (typeof maybe === 'string' && maybe.trim()) {
      return maybe.trim()
    }
    const values = Object.values(details as Record<string, unknown>)
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim()
      }
    }
  }
  return null
}

function mapRow(row: AuditRow): NotificationPayload {
  const action = row.action ?? 'update'
  const message = extractDetailsMessage(row.details) ?? fallbackMessage(row)
  return {
    id: row.id,
    occurredAt: row.at ?? row.created_at,
    table: row.table_name ?? 'system',
    action,
    rowId: row.row_id,
    severity: deriveSeverity(action),
    message,
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const sb = sbService()
    const sp = new URL(req.url).searchParams
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit') || '20') || 20))

    const { data, error } = await sb
      .from('audit_log')
      .select('id, at, created_at, table_name, action, row_id, details')
      .order('at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) {
      throw createHttpError(500, 'Failed to load notifications', error)
    }

    const notifications = (data ?? []).map(mapRow)
    return json({ notifications })
  } catch (e: unknown) {
    const status = extractStatus(e)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'You do not have access to this resource.' }, 403)
    }

    const msg = logErr('/api/notifications GET', e, { method: req.method })
    await auditError('system', 'notifications', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}

