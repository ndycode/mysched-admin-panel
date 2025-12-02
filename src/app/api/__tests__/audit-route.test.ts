/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest'

import * as route from '../audit/route'

const rows = [
  { id: 1, at: '2024-01-01T00:00:00Z', user_id: 'u1', table_name: 'classes', action: 'INSERT', row_id: 10 },
  { id: 2, at: '2024-01-02T00:00:00Z', user_id: 'u2', table_name: 'sections', action: 'UPDATE', row_id: 11 },
]

const profileRows = [
  { id: 'u1', full_name: 'User One', email: 'one@example.com', avatar_url: null },
  { id: 'u2', full_name: 'User Two', email: 'two@example.com', avatar_url: null },
]

function makeQuery(data: unknown, error: any) {
  const q: any = {
    data,
    error,
  }
  q.select = () => q
  q.limit = () => q
  q.eq = () => q
  q.order = () => q
  q.gte = () => q
  q.lte = () => q
  q.gt = () => q
  q.lt = () => q
  return q
}

const fromMock = vi.fn((table: string) => {
  if (table === 'audit_log') {
    return {
      select: (columns: string) => ({
        limit: () =>
          columns.includes('at')
            ? makeQuery(rows, null)
            : makeQuery(rows, null),
      }),
    }
  }

  if (table === 'profiles') {
    return {
      select: () => ({
        in: () => ({
          data: profileRows,
          error: null,
        }),
      }),
    }
  }

  throw new Error(`unexpected table ${table}`)
})

vi.mock('@/lib/authz', () => ({ requireAdmin: vi.fn(async () => ({ id: 'admin-1' })) }))
vi.mock('@/lib/supabase-service', () => ({
  sbService: vi.fn(() => ({
    from: fromMock,
  })),
}))

function makeReq(query = ''): any {
  const url = new URL(`http://localhost/api/audit${query}`)
  return {
    method: 'GET',
    url: url.toString(),
    headers: new Headers(),
  }
}

describe('/api/audit', () => {
  it('returns audit rows with cursor headers', async () => {
    const res = await route.GET(makeReq())
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Next-Cursor')).toMatch(/^2024-01-02T00:00:00/)
    expect(res.headers.get('X-Next-Cursor-Id')).toBe('2')
    const data = await res.json()
    expect(data).toHaveLength(2)
    expect(data[0].user_name).toBe('User One')
  })

  it('rejects invalid start param', async () => {
    const res = await route.GET(makeReq('?start=not-a-date'))
    expect(res.status).toBe(400)
  })

  it('rejects when start is after end', async () => {
    const res = await route.GET(makeReq('?start=2024-02-01&end=2024-01-01'))
    expect(res.status).toBe(400)
  })
})

