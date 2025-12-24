import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  GeneralSchema,
  NotificationsSchema,
  SecuritySchema,
  SupabaseIntegrationSchema,
  WebhookIntegrationSchema,
  AnalyticsIntegrationSchema,
  IntegrationsSchema,
  SettingsSchema,
  SettingsPartialSchema,
} from '../settings-service'

describe('settings-service schemas', () => {
  describe('GeneralSchema', () => {
    it('validates correct general settings', () => {
      const valid = {
        siteName: 'MySched Admin',
        supportEmail: 'support@example.com',
        timezone: 'America/New_York',
        maintenanceMode: false,
        allowRegistrations: true,
      }
      expect(GeneralSchema.parse(valid)).toEqual(valid)
    })

    it('rejects empty siteName', () => {
      const invalid = {
        siteName: '',
        supportEmail: 'test@test.com',
        timezone: 'UTC',
        maintenanceMode: false,
        allowRegistrations: true,
      }
      expect(() => GeneralSchema.parse(invalid)).toThrow()
    })

    it('rejects invalid email', () => {
      const invalid = {
        siteName: 'Test',
        supportEmail: 'not-an-email',
        timezone: 'UTC',
        maintenanceMode: false,
        allowRegistrations: true,
      }
      expect(() => GeneralSchema.parse(invalid)).toThrow()
    })

    it('rejects extra properties (strict mode)', () => {
      const invalid = {
        siteName: 'Test',
        supportEmail: 'test@test.com',
        timezone: 'UTC',
        maintenanceMode: false,
        allowRegistrations: true,
        extraField: 'should fail',
      }
      expect(() => GeneralSchema.parse(invalid)).toThrow()
    })

    it('trims whitespace from strings', () => {
      const result = GeneralSchema.parse({
        siteName: '  MySched  ',
        supportEmail: '  test@test.com  ',
        timezone: '  UTC  ',
        maintenanceMode: false,
        allowRegistrations: true,
      })
      expect(result.siteName).toBe('MySched')
      expect(result.supportEmail).toBe('test@test.com')
      expect(result.timezone).toBe('UTC')
    })
  })

  describe('NotificationsSchema', () => {
    it('validates correct notifications settings', () => {
      const valid = {
        emailAlerts: true,
        smsAlerts: false,
        weeklyDigest: true,
        productUpdates: false,
      }
      expect(NotificationsSchema.parse(valid)).toEqual(valid)
    })

    it('requires all boolean fields', () => {
      const invalid = { emailAlerts: true }
      expect(() => NotificationsSchema.parse(invalid)).toThrow()
    })

    it('rejects non-boolean values', () => {
      const invalid = {
        emailAlerts: 'yes',
        smsAlerts: false,
        weeklyDigest: true,
        productUpdates: false,
      }
      expect(() => NotificationsSchema.parse(invalid)).toThrow()
    })
  })

  describe('SecuritySchema', () => {
    it('validates correct security settings', () => {
      const valid = {
        enforceTwoFactor: true,
        passwordRotationDays: 90,
        sessionTimeoutMinutes: 30,
        auditLogRetentionDays: 365,
      }
      expect(SecuritySchema.parse(valid)).toEqual(valid)
    })

    it('enforces minimum values', () => {
      expect(() =>
        SecuritySchema.parse({
          enforceTwoFactor: false,
          passwordRotationDays: -1,
          sessionTimeoutMinutes: 30,
          auditLogRetentionDays: 90,
        }),
      ).toThrow()

      expect(() =>
        SecuritySchema.parse({
          enforceTwoFactor: false,
          passwordRotationDays: 90,
          sessionTimeoutMinutes: 1, // min is 5
          auditLogRetentionDays: 90,
        }),
      ).toThrow()

      expect(() =>
        SecuritySchema.parse({
          enforceTwoFactor: false,
          passwordRotationDays: 90,
          sessionTimeoutMinutes: 30,
          auditLogRetentionDays: 10, // min is 30
        }),
      ).toThrow()
    })

    it('enforces maximum values', () => {
      expect(() =>
        SecuritySchema.parse({
          enforceTwoFactor: false,
          passwordRotationDays: 5000, // max is 3650
          sessionTimeoutMinutes: 30,
          auditLogRetentionDays: 90,
        }),
      ).toThrow()

      expect(() =>
        SecuritySchema.parse({
          enforceTwoFactor: false,
          passwordRotationDays: 90,
          sessionTimeoutMinutes: 2000, // max is 1440
          auditLogRetentionDays: 90,
        }),
      ).toThrow()

      expect(() =>
        SecuritySchema.parse({
          enforceTwoFactor: false,
          passwordRotationDays: 90,
          sessionTimeoutMinutes: 30,
          auditLogRetentionDays: 5000, // max is 3650
        }),
      ).toThrow()
    })

    it('requires integers', () => {
      expect(() =>
        SecuritySchema.parse({
          enforceTwoFactor: false,
          passwordRotationDays: 90.5,
          sessionTimeoutMinutes: 30,
          auditLogRetentionDays: 90,
        }),
      ).toThrow()
    })
  })

  describe('SupabaseIntegrationSchema', () => {
    it('validates correct supabase settings', () => {
      const valid = {
        url: 'https://example.supabase.co',
        anonKeyConfigured: true,
        serviceRoleConfigured: true,
        projectRef: 'abcd1234',
        connected: true,
        lastVerifiedAt: '2024-01-01T00:00:00Z',
        latencyMs: 150,
        lastRotatedAt: null,
      }
      expect(SupabaseIntegrationSchema.parse(valid)).toEqual(valid)
    })

    it('allows null values for optional fields', () => {
      const valid = {
        url: null,
        anonKeyConfigured: false,
        serviceRoleConfigured: false,
        projectRef: null,
        connected: false,
      }
      expect(SupabaseIntegrationSchema.parse(valid)).toBeDefined()
    })

    it('requires non-negative latency', () => {
      expect(() =>
        SupabaseIntegrationSchema.parse({
          url: 'https://example.supabase.co',
          anonKeyConfigured: true,
          serviceRoleConfigured: true,
          projectRef: 'abcd1234',
          connected: true,
          latencyMs: -10,
        }),
      ).toThrow()
    })
  })

  describe('WebhookIntegrationSchema', () => {
    it('validates correct webhook settings', () => {
      const valid = {
        connected: true,
        endpoint: 'https://webhook.example.com/notify',
        lastVerifiedAt: '2024-01-01T00:00:00Z',
      }
      expect(WebhookIntegrationSchema.parse(valid)).toEqual(valid)
    })

    it('allows null endpoint', () => {
      const valid = {
        connected: false,
        endpoint: null,
      }
      expect(WebhookIntegrationSchema.parse(valid)).toBeDefined()
    })
  })

  describe('AnalyticsIntegrationSchema', () => {
    it('validates correct analytics settings', () => {
      const valid = {
        connected: true,
        provider: 'segment',
        lastExportAt: '2024-01-01T00:00:00Z',
        destination: 'bigquery',
      }
      expect(AnalyticsIntegrationSchema.parse(valid)).toEqual(valid)
    })

    it('allows null provider', () => {
      const valid = {
        connected: false,
        provider: null,
      }
      expect(AnalyticsIntegrationSchema.parse(valid)).toBeDefined()
    })
  })

  describe('IntegrationsSchema', () => {
    it('validates complete integrations object', () => {
      const valid = {
        supabase: {
          url: 'https://example.supabase.co',
          anonKeyConfigured: true,
          serviceRoleConfigured: true,
          projectRef: 'ref123',
          connected: true,
        },
        webhook: {
          connected: false,
          endpoint: null,
        },
        analytics: {
          connected: false,
          provider: null,
        },
      }
      expect(IntegrationsSchema.parse(valid)).toBeDefined()
    })
  })

  describe('SettingsSchema', () => {
    it('validates complete settings object', () => {
      const valid = {
        general: {
          siteName: 'Test Site',
          supportEmail: 'test@test.com',
          timezone: 'UTC',
          maintenanceMode: false,
          allowRegistrations: true,
        },
        notifications: {
          emailAlerts: true,
          smsAlerts: false,
          weeklyDigest: true,
          productUpdates: true,
        },
        security: {
          enforceTwoFactor: false,
          passwordRotationDays: 180,
          sessionTimeoutMinutes: 30,
          auditLogRetentionDays: 90,
        },
        integrations: {
          supabase: {
            url: 'https://example.supabase.co',
            anonKeyConfigured: true,
            serviceRoleConfigured: true,
            projectRef: 'ref123',
            connected: true,
          },
          webhook: {
            connected: false,
            endpoint: null,
          },
          analytics: {
            connected: false,
            provider: null,
          },
        },
      }
      expect(SettingsSchema.parse(valid)).toBeDefined()
    })
  })

  describe('SettingsPartialSchema', () => {
    it('allows partial updates', () => {
      const partial = {
        general: {
          siteName: 'New Name',
        },
      }
      expect(SettingsPartialSchema.parse(partial)).toBeDefined()
    })

    it('allows empty object', () => {
      expect(SettingsPartialSchema.parse({})).toEqual({})
    })

    it('validates nested partial objects', () => {
      const partial = {
        security: {
          enforceTwoFactor: true,
        },
        integrations: {
          webhook: {
            connected: true,
          },
        },
      }
      expect(SettingsPartialSchema.parse(partial)).toBeDefined()
    })
  })
})
