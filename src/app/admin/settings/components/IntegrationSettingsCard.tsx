import type { ReactNode } from 'react'

import { Download, KeyRound, RefreshCw, Send, Settings as SettingsIcon } from 'lucide-react'

import { Button, Input, Select } from '@/components/ui'
import { StatusPill } from '../../_components/design-system'

import { ANALYTICS_OPTIONS } from '../constants'
import type { IntegrationActionStatus, SettingsState, SupabaseTestState } from '../types'
import { formatRelativeTime } from '../utils'
import { SkeletonBlock } from './SkeletonBlock'

type IntegrationSettingsCardProps = {
  loading: boolean
  settings: SettingsState | null
  supabaseTest: SupabaseTestState
  onSupabaseProjectRefChange: (value: string) => void
  onTestSupabase: () => void
  onRotateKeys: () => void
  onWebhookEndpointChange: (value: string) => void
  onWebhookPing: () => void
  onAnalyticsProviderChange: (value: string) => void
  onAnalyticsDestinationChange: (value: string) => void
  onAnalyticsConfigure: () => void
  onAnalyticsExport: () => void
  analyticsStatus: IntegrationActionStatus
  webhookStatus: IntegrationActionStatus
}

export function IntegrationSettingsCard({
  loading,
  settings,
  supabaseTest,
  onSupabaseProjectRefChange,
  onTestSupabase,
  onRotateKeys,
  onWebhookEndpointChange,
  onWebhookPing,
  onAnalyticsProviderChange,
  onAnalyticsDestinationChange,
  onAnalyticsConfigure,
  onAnalyticsExport,
  analyticsStatus,
  webhookStatus,
}: IntegrationSettingsCardProps) {
  if (loading || !settings) {
    return <SkeletonBlock className="h-64" />
  }

  const supabase = settings.integrations.supabase
  const webhook = settings.integrations.webhook
  const analytics = settings.integrations.analytics

  const supabaseEnvConfigured = Boolean(
    supabase.url && supabase.anonKeyConfigured && supabase.serviceRoleConfigured,
  )

  const supabaseStatus = supabaseEnvConfigured ? (supabase.connected ? 'good' : 'warn') : 'error'
  const supabaseStatusLabel =
    supabaseStatus === 'good' ? 'Connected' : supabaseStatus === 'warn' ? 'Pending' : 'Error'

  const supabaseLatency =
    typeof supabase.latencyMs === 'number' && Number.isFinite(supabase.latencyMs)
      ? `${supabase.latencyMs}ms`
      : null

  const supabaseInfo = (() => {
    if (supabaseTest.status === 'testing') return 'Testing connection...'
    if (supabaseTest.message) return supabaseTest.message
    if (supabaseTest.checkedAt) {
      const relative = formatRelativeTime(supabaseTest.checkedAt)
      if (relative) return `Last verified ${relative}.`
    }
    if (supabase.lastRotatedAt) {
      const rotated = formatRelativeTime(supabase.lastRotatedAt)
      if (rotated) return `Keys last rotated ${rotated}.`
    }
    if (supabaseLatency) return `Last latency ${supabaseLatency}.`
    return null
  })()

  const supabaseLastVerified = formatRelativeTime(supabase.lastVerifiedAt) ?? 'Not verified yet'
  const supabaseLastRotated = formatRelativeTime(supabase.lastRotatedAt) ?? 'Not rotated yet'

  const webhookBadgeStatus = webhook.connected ? 'good' : webhook.endpoint ? 'warn' : 'error'
  const webhookBadgeLabel = webhook.connected ? 'Verified' : webhook.endpoint ? 'Pending' : 'Not configured'

  const webhookLastVerified = formatRelativeTime(webhook.lastVerifiedAt)
  const webhookMessage = (() => {
    if (webhookStatus.state === 'pending') return 'Sending verification ping...'
    if (webhookStatus.message) return webhookStatus.message
    if (webhook.connected) {
      return webhookLastVerified ? `Last verified ${webhookLastVerified}.` : 'Webhook verified.'
    }
    if (webhook.endpoint) {
      return 'Webhook pending verification.'
    }
    return 'Add a webhook endpoint to enable automation.'
  })()

  const analyticsBadgeStatus = analyticsStatus.state === 'error' ? 'error' : analytics.connected ? 'good' : 'warn'
  const analyticsBadgeLabel = analyticsStatus.state === 'error' ? 'Error' : analytics.connected ? 'Active' : 'Pending'

  const analyticsExportMessage = (() => {
    const relative = formatRelativeTime(analytics.lastExportAt)
    if (relative) return `Last export ${relative}.`
    return 'No analytics exports have been queued yet.'
  })()

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6" id="settings-integrations-supabase">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-base font-medium text-[var(--foreground)]">Supabase</p>
            <p className="text-sm text-[var(--muted-foreground)]">{supabase.url ?? 'Environment not configured'}</p>
          </div>
          <IntegrationStatusBadge status={supabaseStatus}>{supabaseStatusLabel}</IntegrationStatusBadge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="caps-label caps-label--muted block"
              htmlFor="settings-integrations-supabase-project"
            >
              Project reference
            </label>
            <Input
              id="settings-integrations-supabase-project"
              value={supabase.projectRef ?? ''}
              onChange={event => onSupabaseProjectRefChange(event.target.value)}
              placeholder="project-ref"
              aria-label="Supabase project reference"
            />
          </div>
          <InfoField label="Last verification" value={supabaseLastVerified} />
          <InfoField label="Status" value={supabaseInfo ?? 'No recent verification recorded.'} />
          <InfoField label="Last rotation" value={supabaseLastRotated} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onTestSupabase}
            disabled={supabaseTest.status === 'testing'}
          >
            <RefreshCw className="h-4 w-4" />
            {supabaseTest.status === 'testing' ? 'Testing...' : 'Test connection'}
          </Button>
          <Button type="button" variant="ghost" onClick={onRotateKeys}>
            <KeyRound className="h-4 w-4" />
            Rotate keys
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6" id="settings-integrations-webhook">
        <HeaderWithStatus
          title="Webhook"
          value={webhook.endpoint ?? 'Endpoint not configured'}
          status={webhookBadgeStatus}
          badgeLabel={webhookBadgeLabel}
        />

        <div className="mt-6 space-y-2">
          <label
            className="caps-label caps-label--muted block"
            htmlFor="settings-integrations-webhook-endpoint"
          >
            Endpoint URL
          </label>
          <Input
            id="settings-integrations-webhook-endpoint"
            value={webhook.endpoint ?? ''}
            onChange={event => onWebhookEndpointChange(event.target.value)}
            placeholder="https://example.com/webhook"
            aria-label="Webhook endpoint"
            type="url"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onWebhookPing}
            disabled={webhookStatus.state === 'pending'}
          >
            <Send className="h-4 w-4" />
            {webhookStatus.state === 'pending' ? 'Sending...' : 'Send ping'}
          </Button>
        </div>

        {webhookMessage ? (
          <p
            className={`mt-3 text-sm ${webhookStatus.state === 'error'
              ? 'text-[#be123c]'
              : webhook.connected
                ? 'text-[#15803d]'
                : 'text-[var(--muted-foreground)]'
              }`}
            aria-live="polite"
          >
            {webhookMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6" id="settings-integrations-analytics">
        <HeaderWithStatus
          title="Analytics"
          value={analytics.provider ?? 'No provider configured'}
          status={analyticsBadgeStatus}
          badgeLabel={analyticsBadgeLabel}
        />

        <div className="mt-6 space-y-2">
          <label className="caps-label caps-label--muted block">Provider</label>
          <Select value={analytics.provider ?? 'none'} onChange={event => onAnalyticsProviderChange(event.target.value)} aria-label="Analytics provider">
            {ANALYTICS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-6 space-y-2">
          <label className="caps-label caps-label--muted block">Destination</label>
          <Input
            value={analytics.destination ?? ''}
            onChange={event => onAnalyticsDestinationChange(event.target.value)}
            placeholder="Workspace or dataset"
            aria-label="Analytics destination"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={onAnalyticsConfigure}>
            <SettingsIcon className="h-4 w-4" />
            Configure
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onAnalyticsExport}
            disabled={analyticsStatus.state === 'pending'}
          >
            <Download className="h-4 w-4" />
            {analyticsStatus.state === 'pending' ? 'Exporting...' : 'Export data'}
          </Button>
        </div>

        <p className="mt-3 text-sm text-[var(--muted-foreground)]">{analyticsExportMessage}</p>
        {analyticsStatus.message ? (
          <p
            className={`mt-2 text-sm ${analyticsStatus.state === 'error'
              ? 'text-[#be123c]'
              : analyticsStatus.state === 'success'
                ? 'text-[#15803d]'
                : 'text-[var(--muted-foreground)]'
              }`}
            aria-live="polite"
          >
            {analyticsStatus.message}
          </p>
        ) : null}
      </section>
    </div>
  )
}

type StatusTone = 'good' | 'warn' | 'error'

type HeaderWithStatusProps = {
  title: string
  value: string
  status: StatusTone
  badgeLabel: string
}

function HeaderWithStatus({ title, value, status, badgeLabel }: HeaderWithStatusProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <p className="text-base font-medium text-[var(--foreground)]">{title}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{value}</p>
      </div>
      <IntegrationStatusBadge status={status}>{badgeLabel}</IntegrationStatusBadge>
    </div>
  )
}

type IntegrationStatusBadgeProps = {
  status: StatusTone
  children: ReactNode
}

function IntegrationStatusBadge({ status, children }: IntegrationStatusBadgeProps) {
  const tone = status === 'good' ? 'success' : status === 'warn' ? 'warning' : 'danger'

  return <StatusPill tone={tone}>{children}</StatusPill>
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="caps-label caps-label--muted block">{label}</p>
      <div
        className="rounded-xl border border-[var(--line)] bg-[rgba(15,23,42,0.04)] px-3 py-2 text-sm text-[var(--muted-foreground)]"
        title={value}
      >
        {value}
      </div>
    </div>
  )
}
