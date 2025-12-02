import type { EditableSettings, SettingsState } from './types'

export function cloneSettings(state: SettingsState): SettingsState {
  return JSON.parse(JSON.stringify(state)) as SettingsState
}

export function pickEditable(state: SettingsState): EditableSettings {
  return {
    general: state.general,
    notifications: state.notifications,
    security: state.security,
    integrations: state.integrations,
  }
}

export function formatRelativeTime(iso?: string | null) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const diff = Date.now() - date.getTime()
  if (diff < 0) return date.toLocaleString()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1 minute ago'
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  return date.toLocaleString()
}
