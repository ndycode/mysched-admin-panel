import { NOTIFICATION_OPTIONS } from '../constants'
import type { NotificationKey, SettingsState } from '../types'
import { SkeletonBlock } from './SkeletonBlock'
import { Toggle } from './Toggle'

export type NotificationSettingsCardProps = {
  loading: boolean
  settings: SettingsState | null
  onChange: (key: NotificationKey, value: boolean) => void
}

export function NotificationSettingsCard({ loading, settings, onChange }: NotificationSettingsCardProps) {
  if (loading || !settings) {
    return <SkeletonBlock className="h-40" />
  }

  return (
    <div className="space-y-4">
      {NOTIFICATION_OPTIONS.map(item => (
        <div
          key={item.key}
          className="flex items-start justify-between gap-6 rounded-xl border border-border bg-card px-4 py-3"
        >
          <div className="flex-1">
            <p className="text-base font-medium text-[var(--foreground)]">{item.title}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.description}</p>
          </div>
          <Toggle pressed={settings.notifications[item.key]} onPressedChange={next => onChange(item.key, next)} label={item.title} />
        </div>
      ))}
    </div>
  )
}
