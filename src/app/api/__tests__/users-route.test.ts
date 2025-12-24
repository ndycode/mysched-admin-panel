/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as route from '../users/route'
import * as userDetailRoute from '../users/[id]/route'

type ListUsersResult = {
  data: { users: Array<Record<string, any>>; total?: number }
  error: null | { message?: string; status?: number }
}

type SupabaseQueryResult<T = any> = { data: T; error: any }

type AdminOpResult = { error: any }

type AdminUserResult = { data: { user: Record<string, any> } | null; error: any }

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({ id: 'admin-1' })),
  audit: vi.fn(),
  auditError: vi.fn(),
  throttle: vi.fn(),
  assertSameOrigin: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  logErr: vi.fn(() => 'logged error'),
  sbService: vi.fn(),
}))

vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/audit', () => ({ audit: mocks.audit, auditError: mocks.auditError }))
vi.mock('@/lib/rate', () => ({ throttle: mocks.throttle }))
vi.mock('@/lib/csrf', () => ({ assertSameOrigin: mocks.assertSameOrigin }))
vi.mock('@/lib/request', () => ({ getClientIp: mocks.getClientIp }))
vi.mock('@/lib/log', () => ({ logErr: mocks.logErr }))
vi.mock('@/lib/api-error', () => ({
  extractStatus: (error: any) => error?.status ?? 500,
  validationDetails: (error: any) => ({ message: error.message ?? 'Invalid', issues: [] as any[] }),
}))

vi.mock('@/lib/supabase-service', () => ({ sbService: mocks.sbService }))

let listUsersResult: ListUsersResult
let profilesResult: SupabaseQueryResult<any[]>
let adminsResult: SupabaseQueryResult<any[]>
let profileSelectResult: SupabaseQueryResult<any>
let adminUpsertResult: AdminOpResult
let adminDeleteResult: AdminOpResult
let createUserResult: { data?: { user?: Record<string, any> }; error?: { message?: string; status?: number } | null }
let getUserResult: AdminUserResult
let updateUserResult: AdminUserResult
let profileLookupResult: SupabaseQueryResult<any>
let profileDeleteResult: AdminOpResult

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
  mocks.sbService.mockImplementation(() => ({
    auth: {
      admin: {
        listUsers: vi.fn(async () => listUsersResult),
        createUser: vi.fn(async () => createUserResult),
        deleteUser: vi.fn(async () => adminDeleteResult),
        getUserById: vi.fn(async () => getUserResult),
        updateUserById: vi.fn(async () => updateUserResult),
      },
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => profilesResult),
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => profileLookupResult),
            })),
          })),
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => profileSelectResult),
              })),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(async () => profileDeleteResult),
          })),
        }
      }
      if (table === 'admins') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => adminsResult),
          })),
          upsert: vi.fn(async () => adminUpsertResult),
          delete: vi.fn(() => ({
            eq: vi.fn(async () => adminDeleteResult),
          })),
        }
      }
      if (table === 'user_settings') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }
      return {
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      }
    }),
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  listUsersResult = {
    data: {
      users: [
        {
          id: 'user-1',
          email: 'user@example.com',
          created_at: '2023-01-01T00:00:00.000Z',
          last_sign_in_at: '2023-01-02T00:00:00.000Z',
          identities: [],
          user_metadata: { full_name: 'Test User' },
          app_metadata: {},
        },
      ],
      total: 1,
    },
    error: null,
  }
  profilesResult = {
    data: [
      {
        id: 'user-1',
        full_name: 'Test User',
        student_id: '123',
        email: 'user@example.com',
        app_user_id: 42,
        avatar_url: null,
      },
    ],
    error: null,
  }
  adminsResult = { data: [{ user_id: 'user-1' }], error: null }
  adminUpsertResult = { error: null }
  adminDeleteResult = { error: null }
  createUserResult = {
    data: {
      user: {
        id: 'user-1',
        email: 'user@example.com',
        user_metadata: { full_name: 'Test User' },
        app_metadata: {},
      },
    },
    error: null,
  }
  getUserResult = {
    data: {
      user: {
        id: 'user-1',
        email: 'user@example.com',
        user_metadata: { full_name: 'Test User', student_id: '123' },
        app_metadata: { status: 'active', roles: ['student'] },
        identities: [],
      },
    },
    error: null,
  }
  updateUserResult = {
    data: {
      user: {
        id: 'user-1',
        email: 'updated@example.com',
        user_metadata: { full_name: 'Updated User', student_id: '789', role: 'admin', roles: ['admin'], status: 'active' },
        app_metadata: { role: 'admin', roles: ['admin'], status: 'active' },
        identities: [{ provider: 'password' }],
      },
    },
    error: null,
  }
  profileLookupResult = {
    data: {
      id: 'user-1',
      full_name: 'Existing User',
      student_id: '123',
      email: 'user@example.com',
      app_user_id: 42,
      avatar_url: null,
    },
    error: null,
  }
  profileSelectResult = {
    data: {
      id: 'user-1',
      full_name: 'Updated User',
      student_id: '789',
      email: 'updated@example.com',
      app_user_id: 84,
      avatar_url: null,
    },
    error: null,
  }
  profileDeleteResult = { error: null }
  installSupabaseMock()
})

describe('/api/users route', () => {
  it('GET returns paginated users', async () => {
    const req = makeReq('GET', 'http://localhost/api/users?page=1&limit=20')
    const res = await route.GET(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rows).toHaveLength(1)
    expect(body.rows[0]).toMatchObject({ id: 'user-1', role: 'admin' })
    expect(body.count).toBe(1)
    expect(body.stats).toMatchObject({ total: 1, adminCount: 1, instructorCount: 0, activeUsers: 0 })
  })

  it('GET aggregates stats across all pages', async () => {
    const listUsers = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 'user-1',
              email: 'admin@example.com',
              created_at: '2024-01-01T00:00:00.000Z',
              last_sign_in_at: '2024-01-02T00:00:00.000Z',
              identities: [],
              user_metadata: { status: 'active' },
              app_metadata: {},
            },
          ],
          total: 3,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 'user-2',
              email: 'instructor@example.com',
              created_at: '2024-01-03T00:00:00.000Z',
              last_sign_in_at: '2024-01-04T00:00:00.000Z',
              identities: [],
              user_metadata: { status: 'active', roles: ['instructor'] },
              app_metadata: {},
            },
          ],
          total: 3,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 'user-3',
              email: 'student@example.com',
              created_at: '2024-01-05T00:00:00.000Z',
              last_sign_in_at: '2023-01-05T00:00:00.000Z',
              identities: [],
              user_metadata: { status: 'inactive' },
              app_metadata: {},
            },
          ],
          total: 3,
        },
        error: null,
      })

    const profileSequences = [
      { data: [{ id: 'user-1', full_name: 'Admin', student_id: null, email: 'admin@example.com', app_user_id: null, avatar_url: null }], error: null },
      { data: [{ id: 'user-2', full_name: 'Instructor', student_id: null, email: 'instructor@example.com', app_user_id: null, avatar_url: null }], error: null },
      { data: [{ id: 'user-3', full_name: 'Student', student_id: null, email: 'student@example.com', app_user_id: null, avatar_url: null }], error: null },
    ]

    const adminSequences = [
      { data: [{ user_id: 'user-1' }], error: null },
      { data: [], error: null },
      { data: [], error: null },
    ]

    mocks.sbService.mockImplementation(() => ({
      auth: {
        admin: {
          listUsers,
          createUser: vi.fn(),
          deleteUser: vi.fn(),
        },
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => profileSequences.shift() ?? { data: [], error: null }),
            })),
          }
        }
        if (table === 'admins') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => adminSequences.shift() ?? { data: [], error: null }),
            })),
          }
        }
        return {
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
            })),
          })),
        }
      }),
    }))

    const req = makeReq('GET', 'http://localhost/api/users?page=1&limit=1')
    const res = await route.GET(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stats).toMatchObject({ total: 3, adminCount: 1, instructorCount: 1, activeUsers: 2 })
  })

  it('GET returns unauthorized when admin check fails', async () => {
    mocks.requireAdmin.mockImplementationOnce(async () => {
      const err = new Error('unauthorized') as Error & { status?: number }
      err.status = 401
      throw err
    })
    const req = makeReq('GET', 'http://localhost/api/users?page=1&limit=20')
    const res = await route.GET(req as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Authentication required.')
  })

  it('POST creates a new user', async () => {
    const req = makeReq(
      'POST',
      'http://localhost/api/users',
      {
        full_name: 'New User',
        email: 'new@example.com',
        password: 'TestPass123!',
        password: 'TestPass123!',
      },
      { origin: 'http://localhost', host: 'localhost' },
    )
    const res = await route.POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('user-1')
    expect(mocks.audit).toHaveBeenCalled()
  })

  it('POST maps duplicate email errors to 409', async () => {
    createUserResult = {
      data: {},
      error: { message: 'Already registered', status: 400 },
    }
    installSupabaseMock()
    const req = makeReq(
      'POST',
      'http://localhost/api/users',
      { full_name: 'Existing', email: 'exists@example.com', password: 'TestPass123!' },
      { origin: 'http://localhost', host: 'localhost' },
    )
    const res = await route.POST(req as any)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Email already registered.')
  })
})

describe('/api/users/[id] route', () => {
  it('PATCH updates user metadata, profile, and role', async () => {
    const req = makeReq(
      'PATCH',
      'http://localhost/api/users/user-1',
      {
        email: 'updated@example.com',
        full_name: 'Updated User',
        student_id: '789',
        app_user_id: 84,
        role: 'admin',
        status: 'active',
        password: 'NewPass123!',
      },
      { origin: 'http://localhost', host: 'localhost' },
    )
    const res = await userDetailRoute.PATCH(req as any, {
      params: Promise.resolve({ id: 'user-1' }),
    } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      id: 'user-1',
      email: 'updated@example.com',
      full_name: 'Updated User',
      student_id: '789',
      app_user_id: 84,
      role: 'admin',
      status: 'active',
    })
    expect(mocks.audit).toHaveBeenCalledWith('admin-1', 'users', 'update', 'user-1', {
      details: expect.objectContaining({ email: 'updated@example.com' }),
    })
  })

  it('PATCH returns 404 when the user does not exist', async () => {
    getUserResult = { data: { user: null }, error: null }
    installSupabaseMock()
    const req = makeReq(
      'PATCH',
      'http://localhost/api/users/missing',
      { full_name: 'Missing User' },
      { origin: 'http://localhost', host: 'localhost' },
    )
    const res = await userDetailRoute.PATCH(req as any, {
      params: Promise.resolve({ id: 'missing' }),
    } as any)
    expect(res.status).toBe(404)
  })

  it('DELETE removes the user, profile, and admin membership', async () => {
    const req = makeReq('DELETE', 'http://localhost/api/users/user-1', undefined, {
      origin: 'http://localhost',
      host: 'localhost',
    })
    const res = await userDetailRoute.DELETE(req as any, {
      params: Promise.resolve({ id: 'user-1' }),
    } as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
    expect(mocks.audit).toHaveBeenCalledWith('admin-1', 'users', 'delete', 'user-1', expect.anything())
  })

  it('DELETE returns 404 when the user is missing', async () => {
    getUserResult = { data: { user: null }, error: null }
    installSupabaseMock()
    const req = makeReq('DELETE', 'http://localhost/api/users/missing', undefined, {
      origin: 'http://localhost',
      host: 'localhost',
    })
    const res = await userDetailRoute.DELETE(req as any, {
      params: Promise.resolve({ id: 'missing' }),
    } as any)
    expect(res.status).toBe(404)
  })
})

