import { Input } from '@/components/ui'

import type { SettingsState } from '../types'
import { SkeletonBlock } from './SkeletonBlock'
import { Toggle } from './Toggle'

export type SecuritySettingsCardProps = {
  loading: boolean
  settings: SettingsState | null
  onChange: (key: keyof SettingsState['security'], value: boolean | number) => void
}

export function SecuritySettingsCard({ loading, settings, onChange }: SecuritySettingsCardProps) {
  if (loading || !settings) {
    return <SkeletonBlock className="h-40" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex-1">
          <p className="text-base font-medium text-[var(--foreground)]">Require two-factor authentication</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Recommended for all admin accounts.</p>
        </div>
        <Toggle
          id="settings-security-2fa"
          pressed={settings.security.enforceTwoFactor}
          onPressedChange={next => onChange('enforceTwoFactor', next)}
          label="Require two-factor authentication"
        />
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        <NumberInput
          id="settings-security-password-rotation"
          label="Password rotation (days)"
          value={settings.security.passwordRotationDays}
          onChange={value => onChange('passwordRotationDays', value)}
          min={30}
        />
        <NumberInput
          id="settings-security-session-timeout"
          label="Session timeout (minutes)"
          value={settings.security.sessionTimeoutMinutes}
          onChange={value => onChange('sessionTimeoutMinutes', value)}
          min={5}
        />
        <NumberInput
          id="settings-security-audit-retention"
          label="Audit retention (days)"
          value={settings.security.auditLogRetentionDays}
          onChange={value => onChange('auditLogRetentionDays', value)}
          min={30}
        />
      </div>
    </div>
  )
}

type NumberInputProps = {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
}

function NumberInput({ id, label, value, onChange, min }: NumberInputProps) {
  return (
    <div className="space-y-2">
      <label className="caps-label caps-label--muted block" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={min}
        value={value}
        onChange={event => {
          const next = event.target.value
          onChange(next === '' ? Number.NaN : Number(next))
        }}
        aria-label={label}
      />
    </div>
  )
}
