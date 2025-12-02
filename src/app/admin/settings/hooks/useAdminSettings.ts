import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'

import type {
  EditableSettings,
  IntegrationActionStatus,
  Recommendation,
  SettingsState,
  SupabaseTestState,
} from '../types'
import { cloneSettings, pickEditable } from '../utils'

const SETTINGS_QUERY_KEY = ['admin-settings'] as const

function initialSupabaseTest(state: SettingsState | null): SupabaseTestState {
  if (!state) {
    return { status: 'idle', latencyMs: null, message: null, checkedAt: null }
  }
  return {
    status: 'idle',
    latencyMs: state.integrations.supabase.latencyMs ?? null,
    message: null,
    checkedAt: state.integrations.supabase.lastVerifiedAt ?? null,
  }
}

function initialActionStatus(): IntegrationActionStatus {
  return { state: 'idle', message: null }
}

export function useAdminSettings() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<SettingsState | null>(null)
  const [supabaseTest, setSupabaseTest] = useState<SupabaseTestState>(initialSupabaseTest(null))
  const [analyticsStatus, setAnalyticsStatus] = useState<IntegrationActionStatus>(initialActionStatus())
  const [webhookStatus, setWebhookStatus] = useState<IntegrationActionStatus>(initialActionStatus())
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false)

  const settingsQuery = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () =>
      await api<SettingsState>('/api/settings', { cache: 'no-store' as RequestCache }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!settingsQuery.data) return
    const clone = cloneSettings(settingsQuery.data)
    setDraft(clone)
    setSupabaseTest(initialSupabaseTest(clone))
    setAnalyticsStatus(initialActionStatus())
    setWebhookStatus(initialActionStatus())
  }, [settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (next: EditableSettings) =>
      await api<SettingsState>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(next),
        cache: 'no-store' as RequestCache,
      }),
  })

  const persistSettings = useCallback(
    async (next: SettingsState, successMessage: string) => {
      try {
        const editable = pickEditable(next)
        const data = await saveMutation.mutateAsync(editable)
        setDraft(cloneSettings(data))
        queryClient.setQueryData(SETTINGS_QUERY_KEY, data)
        setSupabaseTest(initialSupabaseTest(data))
        toast({ kind: 'success', msg: successMessage })
        return data
      } catch (error) {
        const message = (error as { message?: string } | null)?.message ?? 'Unable to save settings.'
        toast({ kind: 'error', msg: message })
        return null
      }
    },
    [saveMutation, toast, queryClient],
  )

  const reset = useCallback(() => {
    const current = settingsQuery.data
    if (!current) return
    const clone = cloneSettings(current)
    setDraft(clone)
    setSupabaseTest(initialSupabaseTest(clone))
    setAnalyticsStatus(initialActionStatus())
    setWebhookStatus(initialActionStatus())
    toast({ kind: 'info', msg: 'Settings reverted to last saved values.' })
  }, [settingsQuery.data, toast])

  const dirty = useMemo(() => {
    if (!draft || !settingsQuery.data) return false
    return JSON.stringify(pickEditable(draft)) !== JSON.stringify(pickEditable(settingsQuery.data))
  }, [draft, settingsQuery.data])

  const updateDraft = useCallback(
    (updater: (prev: SettingsState) => SettingsState) => {
      setDraft(prev => {
        if (!prev) return prev
        return updater(prev)
      })
    },
    [],
  )

  const updateGeneral = useCallback(
    (key: keyof SettingsState['general'], value: string | boolean) => {
      updateDraft(prev => ({
        ...prev,
        general: {
          ...prev.general,
          [key]: value,
        },
      }))
    },
    [updateDraft],
  )

  const updateSecurity = useCallback(
    (key: keyof SettingsState['security'], value: boolean | number) => {
      updateDraft(prev => {
        const current = prev.security[key]
        if (typeof current === 'number') {
          const numeric = typeof value === 'number' ? value : Number(value)
          if (!Number.isFinite(numeric)) {
            return prev
          }
          return {
            ...prev,
            security: {
              ...prev.security,
              [key]: numeric,
            },
          }
        }
        return {
          ...prev,
          security: {
            ...prev.security,
            [key]: Boolean(value),
          },
        }
      })
    },
    [updateDraft],
  )

  const updateNotification = useCallback(
    (key: keyof SettingsState['notifications'], value: boolean) => {
      updateDraft(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [key]: value,
        },
      }))
    },
    [updateDraft],
  )

  const updateSupabaseProjectRef = useCallback(
    (value: string) => {
      updateDraft(prev => ({
        ...prev,
        integrations: {
          ...prev.integrations,
          supabase: {
            ...prev.integrations.supabase,
            projectRef: value,
          },
        },
      }))
    },
    [updateDraft],
  )

  const updateWebhookEndpoint = useCallback(
    (value: string) => {
      setWebhookStatus(initialActionStatus())
      updateDraft(prev => ({
        ...prev,
        integrations: {
          ...prev.integrations,
          webhook: {
            ...prev.integrations.webhook,
            endpoint: value,
            connected:
              value.trim() === (prev.integrations.webhook.endpoint ?? '')
                ? prev.integrations.webhook.connected
                : false,
            lastVerifiedAt:
              value.trim() === (prev.integrations.webhook.endpoint ?? '')
                ? prev.integrations.webhook.lastVerifiedAt
                : null,
          },
        },
      }))
    },
    [updateDraft],
  )

  const updateAnalyticsProvider = useCallback(
    (value: string) => {
      const provider = value === 'none' ? null : value
      setAnalyticsStatus(initialActionStatus())
      updateDraft(prev => ({
        ...prev,
        integrations: {
          ...prev.integrations,
          analytics: {
            ...prev.integrations.analytics,
            provider,
            connected: Boolean(provider),
            destination: provider ? prev.integrations.analytics.destination : null,
          },
        },
      }))
    },
    [updateDraft],
  )

  const updateAnalyticsDestination = useCallback(
    (value: string) => {
      setAnalyticsStatus(initialActionStatus())
      updateDraft(prev => ({
        ...prev,
        integrations: {
          ...prev.integrations,
          analytics: {
            ...prev.integrations.analytics,
            destination: value,
          },
        },
      }))
    },
    [updateDraft],
  )

  const testSupabase = useCallback(async () => {
    if (!draft) return
    setSupabaseTest(prev => ({ ...prev, status: 'testing', message: null }))
    try {
      const res = await fetch('/api/settings/test-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        const message = (data && data.error) || 'Supabase connection failed.'
        const timestamp = new Date().toISOString()
        setSupabaseTest({ status: 'error', latencyMs: null, message, checkedAt: timestamp })
        updateDraft(prev => ({
          ...prev,
          integrations: {
            ...prev.integrations,
            supabase: { ...prev.integrations.supabase, connected: false },
          },
        }))
        toast({ kind: 'error', msg: message })
        return
      }
      const latency = typeof data.latencyMs === 'number' ? Math.max(0, Math.round(data.latencyMs)) : null
      const checkedAt = new Date().toISOString()
      setSupabaseTest({
        status: 'success',
        latencyMs: latency,
        message: latency !== null ? `Connection healthy (${latency}ms).` : 'Supabase connection healthy.',
        checkedAt,
      })
      updateDraft(prev => ({
        ...prev,
        integrations: {
          ...prev.integrations,
          supabase: {
            ...prev.integrations.supabase,
            connected: true,
            latencyMs: latency,
            lastVerifiedAt: checkedAt,
          },
        },
      }))
      toast({ kind: 'success', msg: 'Supabase connection verified.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to test Supabase connection.'
      const checkedAt = new Date().toISOString()
      setSupabaseTest({ status: 'error', latencyMs: null, message, checkedAt })
      updateDraft(prev => ({
        ...prev,
        integrations: {
          ...prev.integrations,
          supabase: { ...prev.integrations.supabase, connected: false },
        },
      }))
      toast({ kind: 'error', msg: message })
    }
  }, [draft, toast, updateDraft])

  const recordSupabaseRotation = useCallback(async () => {
    if (!draft) return
    const next = cloneSettings(draft)
    const now = new Date().toISOString()
    next.integrations.supabase.lastRotatedAt = now
    next.integrations.supabase.connected = false
    next.integrations.supabase.lastVerifiedAt = null
    next.integrations.supabase.latencyMs = null
    const result = await persistSettings(next, 'Supabase rotation recorded. Verify the new keys when ready.')
    if (result) {
      setSupabaseTest(initialSupabaseTest(result))
    }
  }, [draft, persistSettings])

  const submitAnalyticsConfig = useCallback(
    async (provider: string | null, destination: string) => {
      if (!draft) return
      const next = cloneSettings(draft)
      next.integrations.analytics.provider = provider
      next.integrations.analytics.connected = Boolean(provider)
      next.integrations.analytics.destination = destination.trim() ? destination.trim() : null
      const result = await persistSettings(
        next,
        provider ? 'Analytics configuration updated.' : 'Analytics integration disconnected.',
      )
      if (!result) {
        setAnalyticsStatus({ state: 'error', message: 'Unable to update analytics configuration.' })
        throw new Error('Unable to update analytics configuration.')
      }
      setAnalyticsStatus(initialActionStatus())
      setAnalyticsDialogOpen(false)
    },
    [draft, persistSettings],
  )

  const exportAnalytics = useCallback(async () => {
    if (!draft) return
    if (!draft.integrations.analytics.provider) {
      const message = 'Connect an analytics provider before exporting.'
      setAnalyticsStatus({ state: 'error', message })
      toast({ kind: 'error', msg: message })
      return
    }
    const next = cloneSettings(draft)
    const timestamp = new Date().toISOString()
    next.integrations.analytics.lastExportAt = timestamp
    setAnalyticsStatus({ state: 'pending', message: 'Exporting analytics data...' })
    const result = await persistSettings(
      next,
      'Analytics export queued. We will email you when it is ready.',
    )
    if (result) {
      setAnalyticsStatus({ state: 'success', message: 'Analytics export queued successfully.' })
    } else {
      setAnalyticsStatus({ state: 'error', message: 'Unable to queue analytics export.' })
    }
  }, [draft, persistSettings, toast])

  const save = useCallback(async () => {
    if (!draft) return
    await persistSettings(draft, 'Settings saved successfully.')
  }, [draft, persistSettings])

  const handleRecommendationDismiss = useCallback(
    (rec: Recommendation) => {
      toast({ kind: 'info', msg: `Dismissed "${rec.title}" for now.` })
    },
    [toast],
  )

  const pingWebhook = useCallback(async () => {
    if (!draft) return
    const endpoint = draft.integrations.webhook.endpoint?.trim()
    if (!endpoint) {
      const message = 'Add a webhook endpoint before sending a ping.'
      setWebhookStatus({ state: 'error', message })
      toast({ kind: 'info', msg: message })
      return
    }

    setWebhookStatus({ state: 'pending', message: 'Sending verification ping...' })
    try {
      const res = await fetch('/api/settings/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ endpoint }),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        const message = (data && data.error) || 'Unable to verify webhook.'
        setWebhookStatus({ state: 'error', message })
        updateDraft(prev => ({
          ...prev,
          integrations: {
            ...prev.integrations,
            webhook: { ...prev.integrations.webhook, connected: false, lastVerifiedAt: null },
          },
        }))
        toast({ kind: 'error', msg: message })
        return
      }

      const verifiedAt = typeof data.checkedAt === 'string' ? data.checkedAt : new Date().toISOString()
      const next = cloneSettings(draft)
      next.integrations.webhook.connected = true
      next.integrations.webhook.lastVerifiedAt = verifiedAt
      const persisted = await persistSettings(next, 'Webhook verified successfully.')
      if (!persisted) {
        setWebhookStatus({ state: 'error', message: 'Unable to save webhook verification.' })
        return
      }
      setWebhookStatus({ state: 'success', message: 'Webhook verified successfully.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify webhook.'
      setWebhookStatus({ state: 'error', message })
      updateDraft(prev => ({
        ...prev,
        integrations: {
          ...prev.integrations,
          webhook: { ...prev.integrations.webhook, connected: false, lastVerifiedAt: null },
        },
      }))
      toast({ kind: 'error', msg: message })
    }
  }, [draft, persistSettings, toast, updateDraft])

  return {
    settings: draft,
    persisted: settingsQuery.data ?? null,
    loading: settingsQuery.isLoading,
    fetching: settingsQuery.isFetching,
    saving: saveMutation.isPending,
    dirty,
    refetch: settingsQuery.refetch,
    supabaseTest,
    analyticsStatus,
    webhookStatus,
    analyticsDialogOpen,
    setAnalyticsDialogOpen,
    updateGeneral,
    updateSecurity,
    updateNotification,
    updateSupabaseProjectRef,
    updateWebhookEndpoint,
    updateAnalyticsProvider,
    updateAnalyticsDestination,
    testSupabase,
    recordSupabaseRotation,
    submitAnalyticsConfig,
    exportAnalytics,
    pingWebhook,
    reset,
    save,
    handleRecommendationDismiss,
  }
}
