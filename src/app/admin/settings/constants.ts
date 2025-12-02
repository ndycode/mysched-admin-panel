import type { NotificationKey } from './types'

export const TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'Asia/Manila',
]

export const NOTIFICATION_OPTIONS: Array<{
  key: NotificationKey
  title: string
  description: string
}> = [
  {
    key: 'emailAlerts',
    title: 'Email alerts',
    description: 'Send alerts when new classes or sections are published.',
  },
  {
    key: 'smsAlerts',
    title: 'SMS alerts',
    description: 'Deliver urgent schedule changes via text message.',
  },
  {
    key: 'weeklyDigest',
    title: 'Weekly digest',
    description: 'Summary of changes emailed every Monday.',
  },
  {
    key: 'productUpdates',
    title: 'Product updates',
    description: 'Hear about new features and improvements.',
  },
]

export const ANALYTICS_OPTIONS = [
  { value: 'none', label: 'Not configured' },
  { value: 'Amplitude', label: 'Amplitude' },
  { value: 'Google Analytics', label: 'Google Analytics' },
  { value: 'Mixpanel', label: 'Mixpanel' },
  { value: 'Plausible', label: 'Plausible' },
  { value: 'Segment', label: 'Segment' },
  { value: 'Custom', label: 'Custom integration' },
]

export const RECOMMENDATION_TARGETS: Record<string, { section: string; focus?: string }> = {
  'support-email': { section: 'settings-general', focus: 'settings-support-email' },
  'enforce-2fa': { section: 'settings-security', focus: 'settings-security-2fa' },
  'verify-webhook': { section: 'settings-integrations-webhook', focus: 'settings-integrations-webhook-endpoint' },
}
