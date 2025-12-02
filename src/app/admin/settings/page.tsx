'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useMemo } from 'react'

import { Button } from '@/components/ui'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { RotateCcw, Save } from 'lucide-react'
import { useToast } from '@/components/toast'
import { PageShell, CardSurface, SectionHeader } from '../_components/design-system'

import { RECOMMENDATION_TARGETS } from './constants'
import { AnalyticsConfigureDialog } from './components/AnalyticsConfigureDialog'
import { EnvironmentSnapshot } from './components/EnvironmentSnapshot'
import { GeneralSettingsCard } from './components/GeneralSettingsCard'
import { IntegrationSettingsCard } from './components/IntegrationSettingsCard'
import { NotificationSettingsCard } from './components/NotificationSettingsCard'
import { RecommendationsCard } from './components/RecommendationsCard'
import { SecuritySettingsCard } from './components/SecuritySettingsCard'
import { useAdminSettings } from './hooks/useAdminSettings'
import type { Recommendation, SnapshotItem } from './types'

export default function SettingsPage() {
  const toast = useToast()
  const {
    settings,
    loading,
    fetching,
    saving,
    dirty,
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
  } = useAdminSettings()

  const snapshotItems = useMemo<SnapshotItem[]>(() => {
    if (!settings) return []

    const maintenance: SnapshotItem = settings.general.maintenanceMode
      ? {
        id: 'maintenance',
        title: 'Maintenance mode',
        headline: 'Enabled',
        helper: 'Scheduling portal is currently offline for updates.',
        status: 'warn',
      }
      : {
        id: 'maintenance',
        title: 'Maintenance mode',
        headline: 'Disabled',
        helper: 'Temporarily take scheduling offline when deploying changes.',
        status: 'good',
      }

    const twoFactor: SnapshotItem = settings.security.enforceTwoFactor
      ? {
        id: 'twofactor',
        title: 'Admin 2FA',
        headline: 'Required',
        helper: 'Protect privileged accounts with MFA.',
        status: 'good',
      }
      : {
        id: 'twofactor',
        title: 'Admin 2FA',
        headline: 'Optional',
        helper: 'Enable mandatory 2FA for all admins to reduce risk.',
        status: 'warn',
      }

    const supabase = settings.integrations.supabase
    const supabaseEnvConfigured = Boolean(
      supabase.url && supabase.anonKeyConfigured && supabase.serviceRoleConfigured,
    )
    let supabaseSnapshot: SnapshotItem = {
      id: 'supabase',
      title: 'Supabase connection',
      headline: 'Error',
      helper: supabase.url ?? 'No project URL configured',
      status: 'error',
    }
    if (supabaseEnvConfigured && supabase.connected) {
      supabaseSnapshot = {
        id: 'supabase',
        title: 'Supabase connection',
        headline: 'Healthy',
        helper: supabase.url ?? 'Project configured',
        status: 'good',
      }
    } else if (supabaseEnvConfigured) {
      supabaseSnapshot = {
        id: 'supabase',
        title: 'Supabase connection',
        headline: 'Warning',
        helper: supabase.url ?? 'Project configured',
        status: 'warn',
      }
    }

    return [maintenance, twoFactor, supabaseSnapshot]
  }, [settings])

  const handleRotateKeys = () => {
    if (!settings) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Record a new Supabase key rotation? Existing credentials will be marked as needing verification.',
      )
    ) {
      return
    }
    void recordSupabaseRotation()
  }

  const handleRecommendation = (rec: Recommendation) => {
    if (rec.complete) {
      toast({ kind: 'info', msg: `${rec.title} is already complete.` })
      return
    }
    const target = RECOMMENDATION_TARGETS[rec.id]
    if (target && typeof document !== 'undefined') {
      const section = document.getElementById(target.section)
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
        if (target.focus) {
          const focusEl = document.getElementById(target.focus)
          if (focusEl && 'focus' in focusEl && typeof (focusEl as HTMLElement).focus === 'function') {
            window.requestAnimationFrame(() => {
              ; (focusEl as HTMLElement).focus({ preventScroll: true })
            })
          }
        }
        return
      }
    }
    toast({ kind: 'info', msg: `Open the ${rec.title} settings to continue.` })
  }

  const loadingState = loading || fetching

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-screen-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Configure defaults, notifications, and integrations.</p>
          </div>
        </div>

        <div className="space-y-8">
          <CardSurface id="settings-environment" className="shadow-sm border-border">
            <SectionHeader
              label="Environment"
              title="Environment snapshot"
              subtitle="Quick read on the current environment before making changes."
            />
            <div className="p-6 pt-0">
              <EnvironmentSnapshot loading={loadingState || !settings} items={snapshotItems} />
            </div>
          </CardSurface>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <CardSurface id="settings-general" className="shadow-sm border-border">
                <SectionHeader
                  label="General"
                  title="General settings"
                  subtitle="Branding and defaults for the scheduling portal."
                />
                <div className="p-6 pt-0">
                  <GeneralSettingsCard loading={loadingState} settings={settings} onChange={updateGeneral} />
                </div>
              </CardSurface>

              <CardSurface id="settings-security" className="shadow-sm border-border">
                <SectionHeader
                  label="Security"
                  title="Security controls"
                  subtitle="Hardening and access controls for administrators."
                />
                <div className="p-6 pt-0">
                  <SecuritySettingsCard loading={loadingState} settings={settings} onChange={updateSecurity} />
                </div>
              </CardSurface>

              <CardSurface id="settings-notifications" className="shadow-sm border-border">
                <SectionHeader
                  label="Notifications"
                  title="Notification preferences"
                  subtitle="Choose how you want to be informed."
                />
                <div className="p-6 pt-0">
                  <NotificationSettingsCard loading={loadingState} settings={settings} onChange={updateNotification} />
                </div>
              </CardSurface>

              <CardSurface className="shadow-sm border-border">
                <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-6">
                  <AnimatedActionBtn
                    type="button"
                    variant="secondary"
                    disabled={loadingState || saving || !dirty}
                    onClick={reset}
                    label="Reset"
                    icon={RotateCcw}
                    className="gap-2 border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  />
                  <AnimatedActionBtn
                    type="button"
                    variant="primary"
                    onClick={() => void save()}
                    disabled={loadingState || saving || !dirty}
                    label={saving ? 'Saving...' : 'Save changes'}
                    icon={Save}
                    isLoading={saving}
                    loadingLabel="Saving..."
                  />
                </div>
              </CardSurface>
            </div>

            <div className="space-y-6">
              <CardSurface id="settings-integrations" className="shadow-sm border-border">
                <SectionHeader
                  label="Integrations"
                  title="External connections"
                  subtitle="Manage connections to Supabase, webhooks, and analytics."
                />
                <div className="p-6 pt-0">
                  <IntegrationSettingsCard
                    loading={loadingState}
                    settings={settings}
                    supabaseTest={supabaseTest}
                    onSupabaseProjectRefChange={updateSupabaseProjectRef}
                    onTestSupabase={() => void testSupabase()}
                    onRotateKeys={handleRotateKeys}
                    onWebhookEndpointChange={updateWebhookEndpoint}
                    onWebhookPing={pingWebhook}
                    onAnalyticsProviderChange={updateAnalyticsProvider}
                    onAnalyticsDestinationChange={updateAnalyticsDestination}
                    onAnalyticsConfigure={() => setAnalyticsDialogOpen(true)}
                    onAnalyticsExport={() => void exportAnalytics()}
                    analyticsStatus={analyticsStatus}
                    webhookStatus={webhookStatus}
                  />
                </div>
              </CardSurface>

              <CardSurface className="shadow-sm border-border">
                <SectionHeader
                  label="Health"
                  title="Recommended actions"
                  subtitle="Keep the admin experience healthy with these follow-ups."
                />
                <div className="p-6 pt-0">
                  <RecommendationsCard
                    loading={loadingState}
                    recommendations={settings?.recommendations ?? []}
                    onAction={handleRecommendation}
                    onDismiss={handleRecommendationDismiss}
                  />
                </div>
              </CardSurface>
            </div>
          </div>

          <AnalyticsConfigureDialog
            open={analyticsDialogOpen}
            provider={settings?.integrations.analytics.provider ?? null}
            destination={settings?.integrations.analytics.destination ?? null}
            onSubmit={submitAnalyticsConfig}
            onClose={() => setAnalyticsDialogOpen(false)}
          />
        </div>
      </div>
    </div>
  )
}
