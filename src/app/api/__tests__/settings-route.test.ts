/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as route from '../settings/route'

type SupabaseResult<T> = { data: T; error: any }

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({ id: 'admin-1' })),
  throttle: vi.fn(),
  assertSameOrigin: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  audit: vi.fn(),
  auditError: vi.fn(),
  logErr: vi.fn(() => 'logged error'),
  sbService: vi.fn(),
}))

vi.mock('@/lib/authz', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/rate', () => ({ throttle: mocks.throttle }))
vi.mock('@/lib/csrf', () => ({ assertSameOrigin: mocks.assertSameOrigin }))
vi.mock('@/lib/request', () => ({ getClientIp: mocks.getClientIp }))
vi.mock('@/lib/audit', () => ({ audit: mocks.audit, auditError: mocks.auditError }))
vi.mock('@/lib/log', () => ({ logErr: mocks.logErr }))
vi.mock('@/lib/api-error', () => ({ extractStatus: (error: any) => error?.status ?? 500 }))
vi.mock('@/lib/supabase-service', () => ({ sbService: mocks.sbService }))

function makeRequest(method: string, url: string, body?: unknown) {
  const nextUrl = new URL(url)
  return {
    method,
    url: nextUrl.toString(),
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}

function installSupabaseMock({
  stored,
  upsertError = null,
}: {
  stored: SupabaseResult<any>
  upsertError?: any
}) {
  installSupabaseMock.currentStored = stored
  mocks.sbService.mockImplementation(() => ({
    from: vi.fn((table: string) => {
      if (table !== 'admin_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
          })),
        }
      }

      const selectChain = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => installSupabaseMock.currentStored) })),
        })),
      }

      return {
        ...selectChain,
        upsert: vi.fn((payload: any) => {
          installSupabaseMock.lastUpsert = payload
          installSupabaseMock.currentStored = {
            data: {
              general: payload.general,
              notifications: payload.notifications,
              security: payload.security,
              integrations: payload.integrations,
            },
            error: null,
          }
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 'global' }, error: upsertError })),
            })),
          }
        }),
      }
    }),
  }))
}

installSupabaseMock.lastUpsert = null as any
installSupabaseMock.currentStored = { data: null, error: null } as SupabaseResult<any>

describe('/api/settings route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.stubEnv('SUPABASE_SERVICE_ROLE', 'service-key')
    vi.stubEnv('NEXT_PUBLIC_SITE_NAME', 'Portal Admin')
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', 'help@portal.test')
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_TIMEZONE', 'Asia/Singapore')
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SIGNUPS', 'false')
    vi.stubEnv('NEXT_PUBLIC_NOTIFICATIONS_SMS', 'true')
    vi.stubEnv('NEXT_PUBLIC_PASSWORD_ROTATION_DAYS', '120')
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_PROVIDER', 'Mixpanel')
    installSupabaseMock({ stored: { data: null, error: null } })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('GET returns merged settings using environment defaults when storage empty', async () => {
    const res = await route.GET()
    expect(res.status).toBe(200)
    const json = (await res.json()) as route.AdminSettingsResponse

    expect(json.general.siteName).toBe('Portal Admin')
    expect(json.general.supportEmail).toBe('help@portal.test')
    expect(json.general.timezone).toBe('Asia/Singapore')
    expect(json.general.allowRegistrations).toBe(false)
    expect(json.notifications.smsAlerts).toBe(true)
    expect(json.integrations.analytics.provider).toBe('Mixpanel')
    expect(Array.isArray(json.recommendations)).toBe(true)
  })

  it('GET merges stored settings over environment defaults', async () => {
    installSupabaseMock({
      stored: {
        data: {
          general: { siteName: 'Stored Name' },
          notifications: { smsAlerts: false },
          integrations: {
            webhook: { endpoint: 'https://example.com/webhook', connected: true },
          },
        },
        error: null,
      },
    })

    const res = await route.GET()
    expect(res.status).toBe(200)
    const json = (await res.json()) as route.AdminSettingsResponse
    expect(json.general.siteName).toBe('Stored Name')
    expect(json.notifications.smsAlerts).toBe(false)
    expect(json.integrations.webhook.connected).toBe(true)
    expect(json.integrations.webhook.endpoint).toBe('https://example.com/webhook')
  })

  it('PATCH persists sanitized settings and returns fresh payload', async () => {
    const payload = {
      general: {
        siteName: ' Portal HQ ',
        supportEmail: 'ops@portal.test',
        timezone: 'UTC',
        maintenanceMode: true,
        allowRegistrations: false,
      },
      notifications: {
        emailAlerts: true,
        smsAlerts: false,
        weeklyDigest: true,
        productUpdates: false,
      },
      security: {
        enforceTwoFactor: true,
        passwordRotationDays: 60,
        sessionTimeoutMinutes: 45,
        auditLogRetentionDays: 365,
      },
      integrations: {
        supabase: {
          url: 'https://custom.supabase.co',
          anonKeyConfigured: true,
          serviceRoleConfigured: true,
          projectRef: ' project-ref ',
          connected: true,
          lastVerifiedAt: '2024-01-01T00:00:00.000Z',
          latencyMs: 98.6,
          lastRotatedAt: '2024-01-02T00:00:00.000Z',
        },
        webhook: {
          connected: true,
          endpoint: 'https://example.com/webhook ',
          lastVerifiedAt: '2024-01-03T00:00:00.000Z',
        },
        analytics: {
          connected: true,
          provider: 'Amplitude',
          lastExportAt: '2024-01-04T00:00:00.000Z',
          destination: ' s3://bucket ',
        },
      },
    }

    installSupabaseMock({
      stored: { data: null, error: null },
    })

    const req = makeRequest('PATCH', 'http://localhost/api/settings', payload)
    const res = await route.PATCH(req as any)
    expect(res.status).toBe(200)
    expect(mocks.audit).toHaveBeenCalledWith('admin-1', 'admin_settings', 'update', 'global', expect.any(Object))

    const saved = installSupabaseMock.lastUpsert as any
    expect(saved.general.siteName).toBe('Portal HQ')
    expect(saved.integrations.supabase.projectRef).toBe('project-ref')
    expect(saved.integrations.supabase.latencyMs).toBe(99)
    expect(saved.integrations.webhook.endpoint).toBe('https://example.com/webhook')
    expect(saved.integrations.webhook.connected).toBe(true)
    expect(saved.integrations.webhook.lastVerifiedAt).toBe('2024-01-03T00:00:00.000Z')
    expect(saved.integrations.analytics.destination).toBe('s3://bucket')

    const json = (await res.json()) as route.AdminSettingsResponse
    expect(json.general.siteName).toBe('Portal HQ')
    expect(json.integrations.supabase.connected).toBe(true)
  })

  it('PATCH clears webhook verification metadata when disconnected', async () => {
    const payload = {
      general: { siteName: 'Portal', supportEmail: 'ops@portal.test', timezone: 'UTC', maintenanceMode: false, allowRegistrations: true },
      notifications: { emailAlerts: true, smsAlerts: false, weeklyDigest: true, productUpdates: true },
      security: { enforceTwoFactor: false, passwordRotationDays: 30, sessionTimeoutMinutes: 15, auditLogRetentionDays: 90 },
      integrations: {
        supabase: {
          url: 'https://example.supabase.co',
          anonKeyConfigured: true,
          serviceRoleConfigured: true,
          projectRef: null,
          connected: true,
          lastVerifiedAt: null,
          latencyMs: null,
          lastRotatedAt: null,
        },
        webhook: {
          connected: false,
          endpoint: 'https://example.com/webhook',
          lastVerifiedAt: '2024-01-03T00:00:00.000Z',
        },
        analytics: { connected: false, provider: null, lastExportAt: null, destination: null },
      },
    }

    const req = makeRequest('PATCH', 'http://localhost/api/settings', payload)
    const res = await route.PATCH(req as any)
    expect(res.status).toBe(200)
    const saved = installSupabaseMock.lastUpsert as any
    expect(saved.integrations.webhook.connected).toBe(false)
    expect(saved.integrations.webhook.lastVerifiedAt).toBeNull()
    const json = (await res.json()) as route.AdminSettingsResponse
    expect(json.integrations.webhook.connected).toBe(false)
    expect(json.integrations.webhook.lastVerifiedAt).toBeNull()
  })

  it('PATCH returns 503 when service credentials missing', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE', '')
    const payload = {
      general: {
        siteName: 'Portal',
        supportEmail: 'ops@portal.test',
        timezone: 'UTC',
        maintenanceMode: false,
        allowRegistrations: true,
      },
      notifications: {
        emailAlerts: true,
        smsAlerts: true,
        weeklyDigest: true,
        productUpdates: true,
      },
      security: {
        enforceTwoFactor: false,
        passwordRotationDays: 180,
        sessionTimeoutMinutes: 30,
        auditLogRetentionDays: 365,
      },
      integrations: {
        supabase: {
          url: null,
          anonKeyConfigured: false,
          serviceRoleConfigured: false,
          projectRef: null,
          connected: false,
          lastVerifiedAt: null,
          latencyMs: null,
          lastRotatedAt: null,
        },
        webhook: { connected: false, endpoint: null, lastVerifiedAt: null },
        analytics: { connected: false, provider: null, lastExportAt: null, destination: null },
      },
    }

    const req = makeRequest('PATCH', 'http://localhost/api/settings', payload)
    const res = await route.PATCH(req as any)
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toContain('Supabase service credentials')
  })
})


