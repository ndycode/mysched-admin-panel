import { Input, Select } from '@/components/ui'

import { TIMEZONES } from '../constants'
import type { SettingsState } from '../types'
import { SkeletonBlock } from './SkeletonBlock'
import { Toggle } from './Toggle'

export type GeneralSettingsCardProps = {
  loading: boolean
  settings: SettingsState | null
  onChange: (key: keyof SettingsState['general'], value: string | boolean) => void
}

export function GeneralSettingsCard({ loading, settings, onChange }: GeneralSettingsCardProps) {
  if (loading || !settings) {
    return <SkeletonBlock className="h-40" />
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label
          className="caps-label caps-label--muted block"
          htmlFor="settings-site-name"
        >
          Site name
        </label>
        <Input
          id="settings-site-name"
          value={settings.general.siteName}
          onChange={event => onChange('siteName', event.target.value)}
          placeholder="MySched Admin"
          aria-label="Site name"
        />
      </div>
      <div className="space-y-2">
        <label
          className="caps-label caps-label--muted block"
          htmlFor="settings-support-email"
        >
          Support email
        </label>
        <Input
          id="settings-support-email"
          value={settings.general.supportEmail}
          onChange={event => onChange('supportEmail', event.target.value)}
          placeholder="support@example.com"
          aria-label="Support email"
          type="email"
        />
      </div>
      <div className="space-y-2">
        <label
          className="caps-label caps-label--muted block"
          htmlFor="settings-timezone"
        >
          Default timezone
        </label>
        <Select
          id="settings-timezone"
          value={settings.general.timezone}
          onChange={event => onChange('timezone', event.target.value)}
          aria-label="Default timezone"
        >
          {TIMEZONES.map(tz => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-start justify-between gap-6 rounded-2xl border border-border bg-card px-4 py-4">
        <div className="flex-1">
          <p className="text-base font-medium text-[var(--foreground)]">Allow self sign-up</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Enable for users/students to join the portal.</p>
        </div>
        <Toggle
          id="settings-general-self-signup"
          pressed={settings.general.allowRegistrations}
          onPressedChange={next => onChange('allowRegistrations', next)}
          label="Allow self sign-up"
        />
      </div>
      <div className="flex items-start justify-between gap-6 rounded-2xl border border-border bg-card px-4 py-4">
        <div className="flex-1">
          <p className="text-base font-medium text-[var(--foreground)]">Maintenance mode</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Temporarily disable scheduling while applying changes.</p>
        </div>
        <Toggle
          id="settings-general-maintenance"
          pressed={settings.general.maintenanceMode}
          onPressedChange={next => onChange('maintenanceMode', next)}
          label="Maintenance mode"
        />
      </div>
    </div>
  )
}
