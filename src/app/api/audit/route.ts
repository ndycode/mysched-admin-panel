// src/app/api/audit/route.ts
import { NextRequest, NextResponse } from 'next/server'

import { sbService } from '@/lib/supabase-service'
import { withGuard } from '@/lib/with-guard'
import { createHttpError } from '@/lib/http-error'

export const dynamic = 'force-dynamic'

type AuditDbRow = {
  id: number
  at?: string | null
  created_at?: string | null
  user_id: string | null
  table_name: string | null
  action: string | null
  row_id: number | string | null
  details?: unknown
}

type EnrichedAuditRow = AuditDbRow & { user_name?: string | null }

type SortParam = 'recent' | 'oldest' | 'user' | 'table'

type OrderOptions = { ascending?: boolean; nullsFirst?: boolean }

type OrderableQuery<T> = {
  order: (column: string, options: OrderOptions) => T
}

type TemporalQuery<T> = {
  gte: (column: string, value: string) => T
  lte: (column: string, value: string) => T
  gt: (column: string, value: string) => T
  lt: (column: string, value: string) => T
}

type CursorDirection = 'next' | 'prev'

export const GET = withGuard({}, async (req: NextRequest) => {
  const bad = (message: string, status = 400, details?: unknown) => {
    const res = NextResponse.json({ error: message, details }, { status })
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'same-origin')
    return res
  }

    const sp = new URL(req.url).searchParams
    const table = sp.get('table')
    const user_id = sp.get('user_id')
    const actionRaw = sp.get('action')
    const search = sp.get('search')?.trim() ?? ''
    const limitRaw = Number(sp.get('limit') || '0')
    const limit = Math.min(200, limitRaw > 0 ? limitRaw : 200)
    const sort = parseSort(sp.get('sort'))
    const cursorDirection = parseCursorDirection(sp.get('cursor_direction'))

    const startParsed = parseDateParam(sp.get('start'), 'start')
    if (startParsed.error) return bad(startParsed.error, 400)
    const endParsed = parseDateParam(sp.get('end'), 'end')
    if (endParsed.error) return bad(endParsed.error, 400)
    const cursorParsed = parseDateParam(sp.get('cursor'), 'cursor')
    if (cursorParsed.error) return bad(cursorParsed.error, 400)

    if (startParsed.value && endParsed.value && startParsed.value > endParsed.value) {
      return bad('start must be before end', 400)
    }

    const rowIdParam = sp.get('row_id')
    const rowIdFilter = normalizeRowId(rowIdParam)

    const svc = sbService()
    const colsPreferred = 'id, at, created_at, user_id, table_name, action, row_id, details'

    const action = normalizeAction(actionRaw)

    const preferred = buildQuery({
      svc,
      columns: colsPreferred,
      limit,
      table,
      user_id,
      action,
      rowIdFilter,
      sort,
      column: 'at',
      start: startParsed.value,
      end: endParsed.value,
      cursor: cursorParsed.value,
      cursorDirection,
    })

    const resp = await preferred.query
    const err1 = resp.error

    if (err1 && err1.code === '42703') {
      const colsFallback = 'id, created_at, user_id, table_name, action, row_id, details'
      const fallback = buildQuery({
        svc,
        columns: colsFallback,
        limit,
        table,
        user_id,
        action,
        rowIdFilter,
        sort,
        column: 'created_at',
        start: startParsed.value,
        end: endParsed.value,
        cursor: cursorParsed.value,
        cursorDirection,
      })

      const resp2 = await fallback.query
      if (resp2.error) return bad('Failed to load audit log', 500)

      const normalized = normalizeAt(coerceAuditRows(resp2.data))
      const filtered = search ? applySearch(normalized, search) : normalized
      const enriched = await attachUserNames(filtered ?? [], svc)
      const deduped = dedupeLogs(enriched ?? [])
      const response = NextResponse.json(deduped)
      applyCursorHeaders(response, filtered ?? [])
      return response
    }

    if (err1) throw createHttpError(500, 'failed_to_load_audit_log')

    const normalized = normalizeAt(coerceAuditRows(resp.data))
    const filtered = search ? applySearch(normalized, search) : normalized
    const enriched = await attachUserNames(filtered ?? [], svc)
    const deduped = dedupeLogs(enriched ?? [])
    const response = NextResponse.json(deduped)
    applyCursorHeaders(response, filtered ?? [])
    return response
})

export const DELETE = withGuard({ origin: true }, async (_req, _ctx, helpers) => {
  const svc = sbService()
  const { error } = await svc.from('audit_log').delete().gt('id', 0)
  if (error) {
    throw createHttpError(500, 'failed_to_reset_audit_log', error.message ?? 'Unable to reset audit log')
  }
  return helpers.json({ ok: true })
})

function parseSort(value: string | null): SortParam {
  switch (value) {
    case 'oldest':
      return 'oldest'
    case 'user':
      return 'user'
    case 'table':
      return 'table'
    default:
      return 'recent'
  }
}

function normalizeAction(action: string | null): string | null {
  if (!action) return null
  const upper = action.toUpperCase()
  if (upper === 'ALL') return null
  if (upper === 'INSERT' || upper === 'UPDATE' || upper === 'DELETE') return upper
  return upper
}

function dedupeLogs(rows: EnrichedAuditRow[]): EnrichedAuditRow[] {
  const result: EnrichedAuditRow[] = []
  const seen = new Map<string, number>()

  for (const row of rows) {
    const ts = row.at ?? row.created_at ?? null
    const tsKey = ts ? Math.floor(new Date(ts).getTime() / 1000) : 0
    const key = `${row.table_name ?? ''}|${row.row_id ?? ''}|${row.action ?? ''}|${tsKey}`
    const existingIndex = seen.get(key)

    if (existingIndex === undefined) {
      seen.set(key, result.length)
      result.push(row)
      continue
    }

    const existing = result[existingIndex]
    const existingHasUser = Boolean(existing.user_id)
    const incomingHasUser = Boolean(row.user_id)
    if (!existingHasUser && incomingHasUser) {
      result[existingIndex] = row
    }
  }

  return result
}

function applyOrdering<T extends OrderableQuery<T>>(query: T, sort: SortParam, column: 'at' | 'created_at') {
  if (sort === 'user') {
    return {
      query: query
        .order('user_id', { ascending: true, nullsFirst: true })
        .order(column, { ascending: false, nullsFirst: false }),
      ascending: false,
    }
  }
  if (sort === 'table') {
    return {
      query: query
        .order('table_name', { ascending: true, nullsFirst: true })
        .order(column, { ascending: false, nullsFirst: false }),
      ascending: false,
    }
  }
  if (sort === 'oldest') {
    return { query: query.order(column, { ascending: true, nullsFirst: true }), ascending: true }
  }
  return { query: query.order(column, { ascending: false, nullsFirst: false }), ascending: false }
}

function normalizeAt(rows: AuditDbRow[]): AuditDbRow[] {
  return rows.map((row) => ({
    ...row,
    at: row.at ?? row.created_at ?? null,
  }))
}

function applySearch(rows: AuditDbRow[], search: string): AuditDbRow[] {
  if (!search) return rows
  const term = search.toLowerCase()
  return rows.filter((row) => {
    const id = row.id?.toString() ?? ''
    const user = row.user_id?.toLowerCase() ?? ''
    const table = row.table_name?.toLowerCase() ?? ''
    const rowId = row.row_id ? row.row_id.toString().toLowerCase() : ''
    return id.includes(term) || user.includes(term) || table.includes(term) || rowId.includes(term)
  })
}

function parseDateParam(value: string | null, label: string): { value: string | null; error?: string } {
  if (!value) return { value: null }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { value: null, error: `Invalid ${label} parameter` }
  }
  return { value: date.toISOString() }
}

function parseCursorDirection(value: string | null): CursorDirection {
  return value === 'prev' ? 'prev' : 'next'
}

function normalizeRowId(value: string | null): string | number | null {
  if (!value) return null
  const numeric = Number(value)
  if (!Number.isNaN(numeric)) return numeric
  return value
}

function buildQuery({
  svc,
  columns,
  limit,
  table,
  user_id,
  action,
  rowIdFilter,
  sort,
  column,
  start,
  end,
  cursor,
  cursorDirection,
}: {
  svc: ReturnType<typeof sbService>
  columns: string
  limit: number
  table: string | null
  user_id: string | null
  action: string | null
  rowIdFilter: string | number | null
  sort: SortParam
  column: 'at' | 'created_at'
  start: string | null
  end: string | null
  cursor: string | null
  cursorDirection: CursorDirection
}) {
  let query = svc.from('audit_log').select(columns).limit(limit)
  if (table && table !== 'all') query = query.eq('table_name', table)
  if (user_id) query = query.eq('user_id', user_id)
  if (action) query = query.eq('action', action)
  if (rowIdFilter !== null) query = query.eq('row_id', rowIdFilter)

  const ordered = applyOrdering(query, sort, column)
  const withTemporal = applyTemporalFilters(ordered.query, column, ordered.ascending, {
    start,
    end,
    cursor,
    direction: cursorDirection,
  })
  return { query: withTemporal }
}

function applyTemporalFilters<T extends TemporalQuery<T>>(
  query: T,
  column: string,
  ascending: boolean,
  options: { start: string | null; end: string | null; cursor: string | null; direction: CursorDirection }
): T {
  let nextQuery = query
  if (options.start) nextQuery = nextQuery.gte(column, options.start)
  if (options.end) nextQuery = nextQuery.lte(column, options.end)
  if (options.cursor) {
    const comparator = getCursorComparator(ascending, options.direction)
    nextQuery = comparator === 'gt' ? nextQuery.gt(column, options.cursor) : nextQuery.lt(column, options.cursor)
  }
  return nextQuery
}

function getCursorComparator(ascending: boolean, direction: CursorDirection): 'gt' | 'lt' {
  if (direction === 'next') {
    return ascending ? 'gt' : 'lt'
  }
  return ascending ? 'lt' : 'gt'
}

function applyCursorHeaders(response: NextResponse, rows: AuditDbRow[]) {
  if (!rows || rows.length === 0) return
  const last = rows[rows.length - 1]
  const cursor = (last.at ?? last.created_at ?? null) as string | null
  if (cursor) response.headers.set('X-Next-Cursor', cursor)
  response.headers.set('X-Next-Cursor-Id', String(last.id))
}

function coerceAuditRows(rows: unknown[] | null | undefined): AuditDbRow[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => row as AuditDbRow)
}

type AuditResponseRow = AuditDbRow & { user_name?: string | null; user_avatar?: string | null }

async function attachUserNames(rows: AuditDbRow[], svc: ReturnType<typeof sbService>): Promise<AuditResponseRow[]> {
  const ids = Array.from(
    new Set(
      rows
        .map((row) => row.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  )

  if (ids.length === 0) return rows

  const { data, error } = await svc
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', ids)

  if (error) {
    return rows
  }

  const profileMap = new Map<string, { name: string; avatar: string | null }>()
  for (const profile of data ?? []) {
    const id = (profile as { id?: string | null })?.id
    if (!id) continue
    const fullName = (profile as { full_name?: string | null })?.full_name ?? null
    const email = (profile as { email?: string | null })?.email ?? null
    const avatar = (profile as { avatar_url?: string | null })?.avatar_url ?? null
    const label = (fullName ?? email ?? '').trim()

    // We want to map it even if label is empty, though usually it won't be if email exists
    // But keeping original logic: only if label exists
    if (label) {
      profileMap.set(id, { name: label, avatar })
    }
  }

  return rows.map((row) => {
    const profile = row.user_id ? profileMap.get(row.user_id) : null
    return {
      ...row,
      user_name: profile?.name ?? null,
      user_avatar: profile?.avatar ?? null,
    }
  })
}
