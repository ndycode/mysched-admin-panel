/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import * as route from '../sections/route'

type SupabaseResult<T = any> = { data: T; error: any }

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({ id: 'admin-1' })),
  audit: vi.fn(),
  auditError: vi.fn(),
  sbService: vi.fn(),
}))

vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/audit', () => ({ audit: mocks.audit, auditError: mocks.auditError }))
vi.mock('@/lib/supabase-service', () => ({ sbService: mocks.sbService }))
vi.mock('@/lib/rate', () => ({ throttle: vi.fn(async () => undefined) }))
vi.mock('@/lib/csrf', () => ({ assertSameOrigin: vi.fn() }))
vi.mock('@/lib/request', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))

let sectionResult: SupabaseResult<any[]>
let classResult: SupabaseResult<any[]>
let insertResult: SupabaseResult<any>
const insertSingle = vi.fn()
const insertSelect = vi.fn(() => ({ single: insertSingle }))
const insertMock = vi.fn(() => ({ select: insertSelect }))

beforeEach(() => {
  sectionResult = { data: [], error: null }
  classResult = { data: [], error: null }
  insertResult = { data: null, error: null }

  mocks.requireAdmin.mockClear()
  mocks.audit.mockClear()
  mocks.auditError.mockClear()
  insertSingle.mockReset()
  insertMock.mockReset()
  insertSelect.mockClear()
  insertSingle.mockImplementation(async () => insertResult)

  const sectionOrder = vi.fn(async () => sectionResult)
  const sectionSelect = vi.fn(() => ({ order: sectionOrder }))

  const classIs = vi.fn(async () => classResult)
  const classSelect = vi.fn(() => ({ is: classIs }))

  mocks.sbService.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'sections') {
        return { select: sectionSelect, insert: insertMock }
      }
      if (table === 'classes') {
        return { select: classSelect }
      }
      return { select: vi.fn(() => ({ order: vi.fn(async () => ({ data: [], error: null })) })) }
    }),
  })
})

function makeRequest(): any {
  const url = new URL('http://localhost:3000/api/sections')
  return {
    method: 'GET',
    url: url.toString(),
    nextUrl: url,
    headers: { get: () => null },
  }
}

describe('/api/sections GET', () => {
  it('returns sections with class counts', async () => {
    sectionResult = {
      data: [
        { id: 1, code: 'ACT 1-1', created_at: '2024-01-01', updated_at: '2024-01-02' },
        { id: 2, code: 'BSCS 1-1', created_at: '2024-02-01', updated_at: '2024-02-02' },
      ],
      error: null,
    }
    classResult = {
      data: [
        { id: 10, section_id: 1 },
        { id: 11, section_id: 1 },
        { id: 12, section_id: 2 },
      ],
      error: null,
    }

    const res = await route.GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    const act = body.find((row: any) => row.id === 1)
    const bscs = body.find((row: any) => row.id === 2)
    expect(act.class_count).toBe(2)
    expect(bscs.class_count).toBe(1)
  })

  it('handles multiple sections and missing classes gracefully', async () => {
    sectionResult = {
      data: [
        { id: 1, code: 'ACT 1-1', created_at: null, updated_at: null },
        { id: 2, code: 'BSCS 1-1', created_at: null, updated_at: null },
        { id: 3, code: 'BSIT 1-1', created_at: null, updated_at: null },
      ],
      error: null,
    }
    classResult = {
      data: [
        { id: 10, section_id: 1 },
        { id: 11, section_id: 1 },
        { id: 12, section_id: 2 },
      ],
      error: null,
    }

    const res = await route.GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    const counts = new Map(body.map((row: any) => [row.id, row.class_count]))
    expect(counts.get(1)).toBe(2)
    expect(counts.get(2)).toBe(1)
    expect(counts.get(3)).toBe(0)
  })

  it('falls back to zero counts when class query fails', async () => {
    sectionResult = {
      data: [{ id: 1, code: 'ACT 1-1', created_at: null, updated_at: null }],
      error: null,
    }
    classResult = { data: [], error: { message: 'boom' } }

    const res = await route.GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0].class_count).toBe(0)
  })

  it('returns empty array when sections query fails', async () => {
    sectionResult = { data: [], error: { message: 'missing column' } }
    const res = await route.GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(0)
  })
})

// POST tests are skipped in this suite because the POST handler depends on more Supabase and rate mocks.
