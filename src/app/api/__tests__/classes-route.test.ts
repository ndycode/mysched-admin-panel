/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as route from '../classes/route'
import * as classDetailRoute from '../classes/[id]/route'

type SupabaseResult<T = any> = { data: T; error: any; count?: number | null }

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({ id: 'admin-1' })),
  audit: vi.fn(),
  auditError: vi.fn(),
  throttle: vi.fn(),
  assertSameOrigin: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  logErr: vi.fn(() => 'logged'),
  sbService: vi.fn(),
}))

vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/audit', () => ({ audit: mocks.audit, auditError: mocks.auditError }))
vi.mock('@/lib/rate', () => ({ throttle: mocks.throttle }))
vi.mock('@/lib/csrf', () => ({ assertSameOrigin: mocks.assertSameOrigin }))
vi.mock('@/lib/request', () => ({ getClientIp: mocks.getClientIp }))
vi.mock('@/lib/log', () => ({ logErr: mocks.logErr }))
vi.mock('@/lib/supabase-service', () => ({ sbService: mocks.sbService }))

let listResult: SupabaseResult<any[]>
let classLookupResult: SupabaseResult<any>
let sectionResult: SupabaseResult<any>
let insertResults: SupabaseResult<any>[]
let updateResult: SupabaseResult<any>
let deleteResult: { error: any }

function makeReq(method: string, url: string, body?: any, headers: Record<string, string> = {}) {
  const nextUrl = new URL(url)
  const headerMap = new Map<string, string>(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  )
  return {
    method,
    url: nextUrl.toString(),
    nextUrl,
    json: async () => body,
    headers: {
      get: (key: string) => headerMap.get(key.toLowerCase()) ?? null,
    },
  } as unknown as Request
}

function installSupabaseMock() {
  const listQuery = {
    eq: vi.fn(() => listQuery),
    in: vi.fn(() => listQuery),
    order: vi.fn(() => listQuery),
    range: vi.fn(() => listQuery),
    or: vi.fn(() => listQuery),
    then: (resolve: any, reject?: any) => Promise.resolve(listResult).then(resolve, reject),
  }

  mocks.sbService.mockImplementation(() => ({
    from: vi.fn((table: string) => {
      if (table === 'classes') {
        return {
          select: vi.fn((_, options?: { count?: string | null }) => {
            if (options?.count === 'exact') {
              return listQuery
            }
            return {
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => classLookupResult),
              })),
            }
          }),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                const next = insertResults.shift() ?? { data: null, error: null }
                return next
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => updateResult),
              })),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(async () => deleteResult),
          })),
        }
      }
      if (table === 'sections') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => sectionResult),
            })),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      }
    }),
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  listResult = {
    data: [
      {
        id: 1,
        code: 'MATH101',
        title: 'Calculus',
        day: 'Mon',
        start: '09:00',
        end: '10:00',
        section_id: 2,
        section_id: 2,
        instructor_profile: { id: 'i-1', full_name: 'Unassigned', email: null, title: null, department: null, avatar_url: null },
      },
    ],
    count: 1,
    error: null,
  }
  classLookupResult = {
    data: {
      id: 1,
      code: 'MATH101',
      title: 'Calculus',
      day: 'Mon',
      start: '09:00',
      end: '10:00',
      section_id: 2,
      section_id: 2,
      instructor_profile: { id: 'i-1', full_name: 'Dr. Smith', email: 'dr@school.edu', title: 'Prof', department: 'Math', avatar_url: null },
    },
    error: null,
  }
  sectionResult = {
    data: { id: 2, code: 'SEC-1', section_number: '01', class_code: 'MATH101', class_name: 'Calculus', time_slot: 'MWF', room: '101', enrolled: 10, capacity: 30, status: 'open' },
    error: null,
  }
  insertResults = [
    {
      data: {
        id: 10,
        code: 'CS101',
        title: 'Algorithms',
        day: 'Monday',
        start: '11:00',
        end: '12:00',
        section_id: 2,
        section_id: 2,
        instructor_id: '11111111-1111-4111-8111-111111111111',
      },
      error: null,
    },
  ]
  updateResult = {
    data: {
      id: 1,
      code: 'MATH101',
      title: 'Calculus II',
      day: 'Tuesday',
      start: '10:00',
      end: '11:00',
      section_id: 2,
      section_id: 2,
    },
    error: null,
  }
  deleteResult = { error: null }
  installSupabaseMock()
})

describe('/api/classes route', () => {
  it('GET returns paginated classes with normalized day and instructor', async () => {
    const res = await route.GET(makeReq('GET', 'http://localhost/api/classes?page=1&limit=10&sort=title') as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rows).toHaveLength(1)
    expect(body.rows[0]).toMatchObject({ id: 1, code: 'MATH101', day: 'Monday' })
    expect(body.rows[0].instructor).toBeNull()
    expect(body.count).toBe(1)
  })

  it('POST creates a class and audits the insert', async () => {
    const res = await route.POST(
      makeReq(
        'POST',
        'http://localhost/api/classes',
        {
          title: 'Algorithms',
          code: 'CS101',
          section_id: 2,
          day: null,
          start: '11:00',
          end: '12:00',
          units: 3,
          room: '101',
          room: '101',
          instructor_id: '11111111-1111-4111-8111-111111111111',
        },
        { origin: 'http://localhost', host: 'localhost' },
      ) as any,
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.id).toBe(10)
    expect(mocks.audit).toHaveBeenCalledWith('admin-1', 'classes', 'insert', 10, expect.anything())
  })

  it('POST maps duplicate code errors to 409', async () => {
    insertResults = [{ data: null, error: { code: '23505', details: '', message: 'duplicate' } }]
    installSupabaseMock()
    const res = await route.POST(
      makeReq(
        'POST',
        'http://localhost/api/classes',
        {
          title: 'Algorithms',
          code: 'CS101',
          section_id: 2,
          day: 'Monday',
          start: '11:00',
          end: '12:00',
        },
        { origin: 'http://localhost', host: 'localhost' },
      ) as any,
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Class code already exists.')
  })

  it('POST accepts null instructor when not provided', async () => {
    insertResults = [
      {
        data: {
          id: 11,
          code: 'CS102',
          title: 'DS',
          day: null,
          start: '08:00',
          end: '09:00',
          section_id: 2,
          section_id: 2,
          instructor_id: null,
        },
        error: null,
      },
    ]
    installSupabaseMock()

    const res = await route.POST(
      makeReq(
        'POST',
        'http://localhost/api/classes',
        {
          title: 'DS',
          code: 'CS102',
          section_id: 2,
          day: null,
          start: '08:00',
          end: '09:00',
          units: null,
          room: null,
          instructor_id: null,
        },
        { origin: 'http://localhost', host: 'localhost' },
      ) as any,
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.instructor_id).toBeNull()
  })
})

describe('/api/classes/[id] route', () => {
  it('GET returns a single class with normalized day and section', async () => {
    const res = await classDetailRoute.GET(makeReq('GET', 'http://localhost/api/classes/1') as any, {
      params: Promise.resolve({ id: '1' }),
    } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ id: 1, code: 'MATH101', day: 'Monday', section: expect.objectContaining({ id: 2 }) })
  })

  it('PATCH updates a class and audits the change', async () => {
    const res = await classDetailRoute.PATCH(
      makeReq(
        'PATCH',
        'http://localhost/api/classes/1',
        { title: 'Calculus II', day: 'Tuesday', room: 'B100' },
        { origin: 'http://localhost', host: 'localhost' },
      ) as any,
      { params: Promise.resolve({ id: '1' }) } as any,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBe('Calculus II')
    expect(body.day).toBe('Tuesday')
    expect(mocks.audit).toHaveBeenCalledWith('admin-1', 'classes', 'update', 1, expect.anything())
  })

  it('DELETE removes a class and audits the deletion', async () => {
    const res = await classDetailRoute.DELETE(
      makeReq('DELETE', 'http://localhost/api/classes/1', undefined, { origin: 'http://localhost', host: 'localhost' }) as any,
      { params: Promise.resolve({ id: '1' }) } as any,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
    expect(mocks.audit).toHaveBeenCalledWith('admin-1', 'classes', 'delete', 1, expect.anything())
  })

  it('DELETE returns 404 when the class does not exist', async () => {
    classLookupResult = { data: null, error: null }
    installSupabaseMock()
    const res = await classDetailRoute.DELETE(
      makeReq('DELETE', 'http://localhost/api/classes/99', undefined, { origin: 'http://localhost', host: 'localhost' }) as any,
      { params: Promise.resolve({ id: '99' }) } as any,
    )
    expect(res.status).toBe(404)
  })
})

