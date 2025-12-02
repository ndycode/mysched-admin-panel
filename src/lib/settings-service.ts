import { z } from 'zod'
import { sbService } from '@/lib/supabase-service'
import { audit } from '@/lib/audit'

// --- Schemas ---

export const GeneralSchema = z
    .object({
        siteName: z.string().trim().min(1).max(120),
        supportEmail: z.string().trim().email().max(160),
        timezone: z.string().trim().min(1).max(120),
        maintenanceMode: z.boolean(),
        allowRegistrations: z.boolean(),
    })
    .strict()

export const NotificationsSchema = z
    .object({
        emailAlerts: z.boolean(),
        smsAlerts: z.boolean(),
        weeklyDigest: z.boolean(),
        productUpdates: z.boolean(),
    })
    .strict()

export const SecuritySchema = z
    .object({
        enforceTwoFactor: z.boolean(),
        passwordRotationDays: z.number().int().min(0).max(3650),
        sessionTimeoutMinutes: z.number().int().min(5).max(1440),
        auditLogRetentionDays: z.number().int().min(30).max(3650),
    })
    .strict()

export const SupabaseIntegrationSchema = z
    .object({
        url: z.string().trim().max(300).nullable(),
        anonKeyConfigured: z.boolean(),
        serviceRoleConfigured: z.boolean(),
        projectRef: z.string().trim().max(120).nullable(),
        connected: z.boolean(),
        lastVerifiedAt: z.string().nullable().optional(),
        latencyMs: z.number().nonnegative().nullable().optional(),
        lastRotatedAt: z.string().nullable().optional(),
    })
    .strict()

export const WebhookIntegrationSchema = z
    .object({
        connected: z.boolean(),
        endpoint: z.string().trim().max(400).nullable(),
        lastVerifiedAt: z.string().nullable().optional(),
    })
    .strict()

export const AnalyticsIntegrationSchema = z
    .object({
        connected: z.boolean(),
        provider: z.string().trim().max(200).nullable(),
        lastExportAt: z.string().nullable().optional(),
        destination: z.string().trim().max(200).nullable().optional(),
    })
    .strict()

export const IntegrationsSchema = z
    .object({
        supabase: SupabaseIntegrationSchema,
        webhook: WebhookIntegrationSchema,
        analytics: AnalyticsIntegrationSchema,
    })
    .strict()

export const SettingsSchema = z
    .object({
        general: GeneralSchema,
        notifications: NotificationsSchema,
        security: SecuritySchema,
        integrations: IntegrationsSchema,
    })
    .strict()

export const SettingsPartialSchema = z
    .object({
        general: GeneralSchema.partial().optional(),
        notifications: NotificationsSchema.partial().optional(),
        security: SecuritySchema.partial().optional(),
        integrations: z
            .object({
                supabase: SupabaseIntegrationSchema.partial().optional(),
                webhook: WebhookIntegrationSchema.partial().optional(),
                analytics: AnalyticsIntegrationSchema.partial().optional(),
            })
            .partial()
            .optional(),
    })
    .partial()
    .strict()

export type SettingsPayload = z.infer<typeof SettingsSchema>
export type StoredSettings = z.infer<typeof SettingsPartialSchema>

export type Recommendation = {
    id: string
    title: string
    description: string
    cta: string
    complete: boolean
}

export type AdminSettingsResponse = SettingsPayload & {
    recommendations: Recommendation[]
}

// --- Service Implementation ---

export class SettingsService {
    private static canUseServiceClient() {
        return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE)
    }

    private static parseBoolean(value: string | boolean | undefined | null, fallback = false) {
        if (typeof value === 'boolean') return value
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase()
            if (['true', '1', 'yes', 'on'].includes(normalized)) return true
            if (['false', '0', 'no', 'off'].includes(normalized)) return false
        }
        return fallback
    }

    private static parseNumber(value: string | undefined, fallback: number) {
        if (!value) return fallback
        const parsed = Number.parseInt(value, 10)
        return Number.isFinite(parsed) ? parsed : fallback
    }

    private static envDefaults(): SettingsPayload {
        const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'MySched Admin'
        const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com'
        const timezone = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || 'UTC'
        const maintenanceMode = this.parseBoolean(process.env.NEXT_PUBLIC_MAINTENANCE_MODE, false)
        const allowRegistrations = this.parseBoolean(
            process.env.NEXT_PUBLIC_ENABLE_SIGNUPS ?? process.env.NEXT_PUBLIC_ALLOW_SIGNUPS,
            true,
        )

        const emailAlerts = this.parseBoolean(process.env.NEXT_PUBLIC_NOTIFICATIONS_EMAIL, true)
        const smsAlerts = this.parseBoolean(process.env.NEXT_PUBLIC_NOTIFICATIONS_SMS, false)
        const weeklyDigest = this.parseBoolean(process.env.NEXT_PUBLIC_WEEKLY_DIGEST, true)
        const productUpdates = this.parseBoolean(process.env.NEXT_PUBLIC_PRODUCT_UPDATES, true)

        const enforceTwoFactor = this.parseBoolean(
            process.env.NEXT_PUBLIC_REQUIRE_2FA ?? process.env.NEXT_PUBLIC_ENFORCE_2FA,
            false,
        )
        const passwordRotationDays = this.parseNumber(process.env.NEXT_PUBLIC_PASSWORD_ROTATION_DAYS, 180)
        const sessionTimeoutMinutes = this.parseNumber(process.env.NEXT_PUBLIC_SESSION_TIMEOUT, 30)
        const auditLogRetentionDays = this.parseNumber(process.env.NEXT_PUBLIC_AUDIT_RETENTION_DAYS, 90)

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null
        const supabaseAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        const supabaseService = Boolean(process.env.SUPABASE_SERVICE_ROLE)
        const supabaseProjectRef =
            process.env.NEXT_PUBLIC_SUPABASE_REFERENCE || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || null
        const supabaseConnected = Boolean(supabaseUrl && supabaseAnon && supabaseService)

        const webhookEndpoint = process.env.NEXT_PUBLIC_WEBHOOK_URL || process.env.WEBHOOK_URL || null
        const analyticsProvider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || process.env.ANALYTICS_WRITE_KEY || null

        return {
            general: {
                siteName,
                supportEmail,
                timezone,
                maintenanceMode,
                allowRegistrations,
            },
            notifications: {
                emailAlerts,
                smsAlerts,
                weeklyDigest,
                productUpdates,
            },
            security: {
                enforceTwoFactor,
                passwordRotationDays,
                sessionTimeoutMinutes,
                auditLogRetentionDays,
            },
            integrations: {
                supabase: {
                    url: supabaseUrl,
                    anonKeyConfigured: supabaseAnon,
                    serviceRoleConfigured: supabaseService,
                    projectRef: supabaseProjectRef,
                    connected: supabaseConnected,
                    lastVerifiedAt: null,
                    latencyMs: null,
                    lastRotatedAt: null,
                },
                webhook: {
                    connected: false,
                    endpoint: webhookEndpoint,
                    lastVerifiedAt: null,
                },
                analytics: {
                    connected: Boolean(analyticsProvider),
                    provider: analyticsProvider,
                    lastExportAt: null,
                    destination: null,
                },
            },
        }
    }

    private static async fetchStoredSettings(): Promise<StoredSettings | null> {
        if (!this.canUseServiceClient()) return null
        try {
            const { data, error } = await sbService()
                .from('admin_settings')
                .select('general,notifications,security,integrations')
                .eq('id', 'global')
                .maybeSingle()

            if (error || !data) return null
            const parsed = SettingsPartialSchema.safeParse(data)
            return parsed.success ? parsed.data : null
        } catch {
            return null
        }
    }

    private static mergeSettings(base: SettingsPayload, stored: StoredSettings | null): SettingsPayload {
        if (!stored) return base

        const merged: SettingsPayload = {
            general: { ...base.general, ...(stored.general ?? {}) },
            notifications: { ...base.notifications, ...(stored.notifications ?? {}) },
            security: { ...base.security, ...(stored.security ?? {}) },
            integrations: {
                supabase: { ...base.integrations.supabase },
                webhook: { ...base.integrations.webhook },
                analytics: { ...base.integrations.analytics },
            },
        }

        if (stored.integrations?.supabase) {
            const supa = stored.integrations.supabase
            if (!merged.integrations.supabase.url && typeof supa.url === 'string') {
                merged.integrations.supabase.url = supa.url
            }
            if (typeof supa.projectRef === 'string' || supa.projectRef === null) {
                merged.integrations.supabase.projectRef = supa.projectRef
            }
            if (typeof supa.lastVerifiedAt === 'string' || supa.lastVerifiedAt === null) {
                merged.integrations.supabase.lastVerifiedAt = supa.lastVerifiedAt ?? null
            }
            if (typeof supa.latencyMs === 'number' || supa.latencyMs === null) {
                merged.integrations.supabase.latencyMs = supa.latencyMs ?? null
            }
            if (typeof supa.lastRotatedAt === 'string' || supa.lastRotatedAt === null) {
                merged.integrations.supabase.lastRotatedAt = supa.lastRotatedAt ?? null
            }
        }

        if (stored.integrations?.webhook) {
            const webhook = stored.integrations.webhook
            if (typeof webhook.endpoint === 'string' || webhook.endpoint === null) {
                merged.integrations.webhook.endpoint = webhook.endpoint
            }
            if (typeof webhook.lastVerifiedAt === 'string' || webhook.lastVerifiedAt === null) {
                merged.integrations.webhook.lastVerifiedAt = webhook.lastVerifiedAt ?? null
            }
            if (typeof webhook.connected === 'boolean') {
                merged.integrations.webhook.connected = webhook.connected
            }
        }

        if (stored.integrations?.analytics) {
            const analytics = stored.integrations.analytics
            if (typeof analytics.provider === 'string' || analytics.provider === null) {
                merged.integrations.analytics.provider = analytics.provider
            }
            if (typeof analytics.lastExportAt === 'string' || analytics.lastExportAt === null) {
                merged.integrations.analytics.lastExportAt = analytics.lastExportAt ?? null
            }
            if (typeof analytics.destination === 'string' || analytics.destination === null) {
                merged.integrations.analytics.destination = analytics.destination ?? null
            }
        }

        const envConfigured = Boolean(
            merged.integrations.supabase.url &&
            merged.integrations.supabase.anonKeyConfigured &&
            merged.integrations.supabase.serviceRoleConfigured,
        )
        const storedConnected = stored.integrations?.supabase?.connected
        merged.integrations.supabase.connected = envConfigured && (typeof storedConnected === 'boolean' ? storedConnected : envConfigured)
        const webhookEndpoint = merged.integrations.webhook.endpoint
        const storedWebhookConnected = stored?.integrations?.webhook?.connected
        merged.integrations.webhook.connected = Boolean(webhookEndpoint) && Boolean(storedWebhookConnected)
        if (!merged.integrations.webhook.connected) {
            merged.integrations.webhook.lastVerifiedAt = null
        }
        merged.integrations.analytics.connected = Boolean(merged.integrations.analytics.provider)

        return merged
    }

    private static buildRecommendations(settings: SettingsPayload): Recommendation[] {
        return [
            {
                id: 'support-email',
                title: 'Set a custom support email',
                description: 'Direct help requests to your team instead of the default inbox.',
                cta: settings.general.supportEmail === 'support@example.com' ? 'Add support email' : 'Update email',
                complete: settings.general.supportEmail !== 'support@example.com',
            },
            {
                id: 'enforce-2fa',
                title: 'Enforce two-factor authentication for admins',
                description: 'Protect privileged accounts by requiring an additional verification step.',
                cta: settings.security.enforceTwoFactor ? '2FA enforced' : 'Require 2FA',
                complete: settings.security.enforceTwoFactor,
            },
            {
                id: 'verify-webhook',
                title: 'Verify automation webhook',
                description: 'Ensure external automations continue syncing without interruption.',
                cta: settings.integrations.webhook.connected ? 'Webhook verified' : 'Add webhook',
                complete: settings.integrations.webhook.connected,
            },
        ]
    }

    private static toNull(value: string | null | undefined) {
        if (typeof value !== 'string') return null
        const trimmed = value.trim()
        return trimmed.length ? trimmed : null
    }

    private static sanitizeForStorage(input: SettingsPayload): SettingsPayload {
        const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null
        const envAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        const envService = Boolean(process.env.SUPABASE_SERVICE_ROLE)
        const supabaseUrl = envUrl || input.integrations.supabase.url || null
        const envConfigured = Boolean(supabaseUrl && envAnon && envService)

        const latency = input.integrations.supabase.latencyMs
        const normalizedLatency =
            typeof latency === 'number' && Number.isFinite(latency) && latency >= 0 ? Math.round(latency) : null

        return {
            general: {
                siteName: input.general.siteName.trim(),
                supportEmail: input.general.supportEmail.trim(),
                timezone: input.general.timezone.trim(),
                maintenanceMode: input.general.maintenanceMode,
                allowRegistrations: input.general.allowRegistrations,
            },
            notifications: { ...input.notifications },
            security: { ...input.security },
            integrations: {
                supabase: {
                    url: supabaseUrl,
                    anonKeyConfigured: envAnon,
                    serviceRoleConfigured: envService,
                    projectRef: this.toNull(input.integrations.supabase.projectRef),
                    connected: envConfigured ? Boolean(input.integrations.supabase.connected) : false,
                    lastVerifiedAt: input.integrations.supabase.lastVerifiedAt ?? null,
                    latencyMs: normalizedLatency,
                    lastRotatedAt: input.integrations.supabase.lastRotatedAt ?? null,
                },
                webhook: {
                    endpoint: this.toNull(input.integrations.webhook.endpoint),
                    connected:
                        Boolean(this.toNull(input.integrations.webhook.endpoint)) && Boolean(input.integrations.webhook.connected),
                    lastVerifiedAt:
                        Boolean(this.toNull(input.integrations.webhook.endpoint)) && input.integrations.webhook.connected
                            ? input.integrations.webhook.lastVerifiedAt ?? null
                            : null,
                },
                analytics: {
                    provider: this.toNull(input.integrations.analytics.provider),
                    connected: Boolean(this.toNull(input.integrations.analytics.provider)),
                    lastExportAt: input.integrations.analytics.lastExportAt ?? null,
                    destination: this.toNull(input.integrations.analytics.destination),
                },
            },
        }
    }

    static async getSettings(): Promise<AdminSettingsResponse> {
        const base = this.envDefaults()
        const stored = await this.fetchStoredSettings()
        const merged = this.mergeSettings(base, stored)
        return { ...merged, recommendations: this.buildRecommendations(merged) }
    }

    static async updateSettings(userId: string, payload: SettingsPayload): Promise<AdminSettingsResponse> {
        if (!this.canUseServiceClient()) {
            throw new Error('Supabase service credentials are not configured.')
        }

        const sanitized = this.sanitizeForStorage(payload)
        const sb = sbService()

        const { error } = await sb
            .from('admin_settings')
            .upsert(
                {
                    id: 'global',
                    general: sanitized.general,
                    notifications: sanitized.notifications,
                    security: sanitized.security,
                    integrations: sanitized.integrations,
                },
                { onConflict: 'id' },
            )
            .select('id')
            .single()

        if (error) throw new Error(error.message || 'Failed to save settings')

        await audit(userId, 'admin_settings', 'update', 'global', { details: sanitized })

        return this.getSettings()
    }
}
