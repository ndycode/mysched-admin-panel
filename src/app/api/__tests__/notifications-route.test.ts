/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as route from '../notifications/route'

type AuditRow = {
  id: number
  at: string | null
  created_at: string | null
  table_name: string | null
  action: string | null
  row_id: number | string | null
  details: unknown
}

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({ id: 'admin-1' })),
  auditError: vi.fn(),
  logErr: vi.fn(() => 'logged error'),
  sbService: vi.fn(),
}))

vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/audit', () => ({ auditError: mocks.auditError }))
vi.mock('@/lib/log', () => ({ logErr: mocks.logErr }))
vi.mock('@/lib/api-error', () => ({ extractStatus: (error: any) => error?.status ?? 500 }))
vi.mock('@/lib/supabase-service', () => ({ sbService: mocks.sbService }))

function makeRequest(url: string) {
  const nextUrl = new URL(url)
  return {
    method: 'GET',
    url: nextUrl.toString(),
    nextUrl,
  } as unknown as Request
}

function installSupabase(rows: AuditRow[], error: any = null) {
  mocks.sbService.mockImplementation(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: rows, error })),
          })),
        })),
      })),
    })),
  }))
}

describe('/api/notifications route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installSupabase([], null)
  })

  it('maps audit rows to notifications with derived severity and message', async () => {
    const rows: AuditRow[] = [
      {
        id: 1,
        at: '2024-01-01T00:00:00.000Z',
        created_at: null,
        table_name: 'classes',
        action: 'error',
        row_id: 5,
        details: { message: 'Failed to import roster' },
      },
      {
        id: 2,
        at: null,
        created_at: '2024-01-02T00:00:00.000Z',
        table_name: 'sections',
        action: 'delete',
        row_id: 7,
        details: null,
      },
      {
        id: 3,
        at: null,
        created_at: '2024-01-03T00:00:00.000Z',
        table_name: null,
        action: 'update',
        row_id: null,
        details: { extra: 'Updated settings' },
      },
    ]
    installSupabase(rows, null)

    const req = makeRequest('http://localhost/api/notifications?limit=5')
    const res = await route.GET(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.notifications).toHaveLength(3)
    expect(json.notifications[0]).toMatchObject({
      id: 1,
      severity: 'error',
      message: 'Failed to import roster',
      table: 'classes',
    })
    expect(json.notifications[1]).toMatchObject({
      id: 2,
      severity: 'warning',
      message: 'Delete on Sections #7',
    })
    expect(json.notifications[2]).toMatchObject({
      id: 3,
      severity: 'info',
      message: 'Updated settings',
    })
  })

  it('returns 401 when admin auth fails', async () => {
    mocks.requireAdmin.mockRejectedValueOnce({ status: 401 })
    const req = makeRequest('http://localhost/api/notifications')
    const res = await route.GET(req as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('Authentication')
  })

  it('audits and reports Supabase errors', async () => {
    installSupabase([], { message: 'boom' })
    const req = makeRequest('http://localhost/api/notifications')
    const res = await route.GET(req as any)
    expect(res.status).toBe(500)
    expect(mocks.auditError).toHaveBeenCalledWith('system', 'notifications', expect.any(String))
    const body = await res.json()
    expect(body.error).toBe('logged error')
  })
})


