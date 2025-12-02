import type { AdminSettingsResponse } from '@/app/api/settings/route'

export type SettingsState = AdminSettingsResponse
export type Recommendation = SettingsState['recommendations'][number]
export type NotificationKey = keyof SettingsState['notifications']

export type SupabaseTestState = {
  status: 'idle' | 'testing' | 'success' | 'error'
  latencyMs: number | null
  message: string | null
  checkedAt: string | null
}

export type IntegrationActionStatus = {
  state: 'idle' | 'pending' | 'success' | 'error'
  message: string | null
}

export type SnapshotItem = {
  id: string
  title: string
  headline: string
  helper: string
  status: 'good' | 'warn' | 'error'
}

export type EditableSettings = Omit<SettingsState, 'recommendations'>
