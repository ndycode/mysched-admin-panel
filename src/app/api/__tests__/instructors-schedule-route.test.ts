/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as route from '../instructors/[id]/schedule/route'

const INSTRUCTOR_ID = '550e8400-e29b-41d4-a716-446655440000'

const mocks = vi.hoisted(() => {
  const updateMock = vi.fn()
  const selectMock = vi.fn(async () => ({ data: [{ id: 42 }], error: null }))
  const eqMock = vi.fn()
  const maybeSingleMock = vi.fn(async () => ({ data: { id: INSTRUCTOR_ID }, error: null }))
  const rpcMock = vi.fn(async () => ({ data: [], error: null }))
  const auditMock = vi.fn()
  const auditErrorMock = vi.fn()

  return { updateMock, selectMock, eqMock, maybeSingleMock, rpcMock, auditMock, auditErrorMock }
})

vi.mock('@/lib/authz', () => ({ requireAdmin: vi.fn(async () => ({ id: 'admin-1' })) }))
vi.mock('@/lib/audit', () => ({ audit: mocks.auditMock, auditError: mocks.auditErrorMock }))
vi.mock('@/lib/rate', () => ({ throttle: vi.fn() }))
vi.mock('@/lib/csrf', () => ({ assertSameOrigin: vi.fn() }))
vi.mock('@/lib/request', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))
vi.mock('@/lib/supabase-service', () => ({
  sbService: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'instructors') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingleMock })),
          })),
        }
      }

      if (table === 'classes') {
        const builder = {
          eq: mocks.eqMock,
          select: mocks.selectMock,
        }

        mocks.eqMock.mockReturnValue(builder)
        mocks.updateMock.mockReturnValue(builder)

        return {
          update: mocks.updateMock,
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
    rpc: mocks.rpcMock,
  })),
}))

describe('DELETE /api/instructors/[id]/schedule', () => {
  beforeEach(() => {
    mocks.updateMock.mockReset()
    mocks.eqMock.mockReset()
    mocks.selectMock.mockReset()
    mocks.selectMock.mockResolvedValue({ data: [{ id: 42 }], error: null })
    mocks.maybeSingleMock.mockResolvedValue({ data: { id: INSTRUCTOR_ID }, error: null })
    mocks.rpcMock.mockReset()
    mocks.rpcMock.mockResolvedValue({ data: [], error: null })
    mocks.auditErrorMock.mockReset()
    mocks.auditMock.mockReset()
  })

  function makeReq(method: string, jsonData?: any): any {
    const nextUrl = new URL(`http://localhost:3000/api/instructors/${INSTRUCTOR_ID}/schedule`)
    return {
      method,
      cookies: {},
      url: nextUrl.toString(),
      nextUrl,
      json: async () => jsonData,
      headers: {
        get: (key: string) => {
          const normalized = key.toLowerCase()
          if (normalized === 'host') return nextUrl.host
          if (normalized === 'origin') return `${nextUrl.protocol}//${nextUrl.host}`
          return undefined
        },
      },
    }
  }

  it('clears instructor assignment for matching class', async () => {
    const req = makeReq('DELETE', { classId: 42 })
    const context = { params: Promise.resolve({ id: INSTRUCTOR_ID }) }

    const res = await route.DELETE(req, context)
    expect(res.status).toBe(200)
    expect(mocks.updateMock).toHaveBeenCalledWith({
      instructor_id: null,
      updated_at: expect.any(String),
    })
    expect(mocks.eqMock).toHaveBeenNthCalledWith(1, 'id', 42)
    expect(mocks.eqMock).toHaveBeenNthCalledWith(2, 'instructor_id', INSTRUCTOR_ID)
    expect(mocks.selectMock).toHaveBeenCalledWith('id')
  })

  it('bubbles supabase errors', async () => {
    mocks.selectMock.mockResolvedValueOnce({ data: null, error: { message: 'update failed' } })
    const req = makeReq('DELETE', { classId: 7 })
    const context = { params: Promise.resolve({ id: INSTRUCTOR_ID }) }

    const res = await route.DELETE(req, context)
    expect(res.status).toBe(500)
  })

  it('returns 404 when class is not assigned to instructor', async () => {
    mocks.selectMock.mockResolvedValueOnce({ data: [], error: null })
    const req = makeReq('DELETE', { classId: 7 })
    const context = { params: Promise.resolve({ id: INSTRUCTOR_ID }) }

    const res = await route.DELETE(req, context)
    expect(res.status).toBe(404)
  })

  it('maps foreign key errors to 422', async () => {
    mocks.selectMock.mockResolvedValueOnce({ data: null, error: { code: '23503', details: 'classes_instructor_id_fkey' } })
    const res = await route.DELETE(makeReq('DELETE', { classId: 9 }), { params: Promise.resolve({ id: INSTRUCTOR_ID }) })
    expect(res.status).toBe(422)
    expect(mocks.auditErrorMock).toHaveBeenCalled()
  })

  it('maps duplicate errors to 409', async () => {
    mocks.selectMock.mockResolvedValueOnce({ data: null, error: { code: '23505' } })
    const res = await route.DELETE(makeReq('DELETE', { classId: 9 }), { params: Promise.resolve({ id: INSTRUCTOR_ID }) })
    expect(res.status).toBe(409)
  })
})

describe('GET /api/instructors/[id]/schedule', () => {
  beforeEach(() => {
    mocks.rpcMock.mockResolvedValue({ data: [{ class_id: 1, code: 'CS1' }], error: null })
    mocks.maybeSingleMock.mockResolvedValue({ data: { id: INSTRUCTOR_ID, full_name: 'Prof' }, error: null })
    mocks.auditErrorMock.mockReset()
  })

  function makeReq(): any {
    const nextUrl = new URL(`http://localhost:3000/api/instructors/${INSTRUCTOR_ID}/schedule`)
    return {
      method: 'GET',
      url: nextUrl.toString(),
      nextUrl,
      headers: { get: () => null },
    }
  }

  it('returns instructor schedule payload', async () => {
    const res = await route.GET(makeReq(), { params: Promise.resolve({ id: INSTRUCTOR_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.instructor.id).toBe(INSTRUCTOR_ID)
    expect(body.classes).toHaveLength(1)
    expect(mocks.rpcMock).toHaveBeenCalledWith('get_instructor_schedule', { p_instructor_id: INSTRUCTOR_ID })
  })

  it('returns 404 when instructor missing', async () => {
    mocks.maybeSingleMock.mockResolvedValueOnce({ data: null, error: null })
    const res = await route.GET(makeReq(), { params: Promise.resolve({ id: INSTRUCTOR_ID }) })
    expect(res.status).toBe(404)
  })

  it('handles RPC error', async () => {
    mocks.rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'rpc fail' } })
    const res = await route.GET(makeReq(), { params: Promise.resolve({ id: INSTRUCTOR_ID }) })
    expect(res.status).toBeGreaterThanOrEqual(500)
  })
})

describe('POST /api/instructors/[id]/schedule', () => {
  beforeEach(() => {
    mocks.rpcMock.mockResolvedValue({ data: null, error: null })
    mocks.maybeSingleMock.mockResolvedValue({ data: { id: INSTRUCTOR_ID, full_name: 'Prof' }, error: null })
    mocks.auditMock.mockReset()
  })

  function makeReq(body: any): any {
    const nextUrl = new URL(`http://localhost:3000/api/instructors/${INSTRUCTOR_ID}/schedule`)
    return {
      method: 'POST',
      url: nextUrl.toString(),
      nextUrl,
      json: async () => body,
      headers: {
        get: (key: string) => {
          const normalized = key.toLowerCase()
          if (normalized === 'host') return nextUrl.host
          if (normalized === 'origin') return `${nextUrl.protocol}//${nextUrl.host}`
          return undefined
        },
      },
    }
  }

  it('assigns class via RPC', async () => {
    const res = await route.POST(makeReq({ classId: 5 }), { params: Promise.resolve({ id: INSTRUCTOR_ID }) })
    expect(res.status).toBe(200)
    expect(mocks.rpcMock).toHaveBeenCalledWith('assign_class_to_instructor', {
      p_class_id: 5,
      p_instructor_id: INSTRUCTOR_ID,
    })
  })

  it('validates payload and returns 422 for invalid body', async () => {
    const res = await route.POST(makeReq({ classId: 'bad' }), { params: Promise.resolve({ id: INSTRUCTOR_ID }) })
    expect(res.status).toBe(422)
  })

  it('handles instructor not found', async () => {
    mocks.maybeSingleMock.mockResolvedValueOnce({ data: null, error: null })
    const res = await route.POST(makeReq({ classId: 5 }), { params: Promise.resolve({ id: INSTRUCTOR_ID }) })
    expect(res.status).toBe(404)
  })

  it('handles RPC failures', async () => {
    mocks.rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'assign failed' } })
    const res = await route.POST(makeReq({ classId: 5 }), { params: Promise.resolve({ id: INSTRUCTOR_ID }) })
    expect(res.status).toBeGreaterThanOrEqual(500)
  })
})

