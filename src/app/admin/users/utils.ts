import type { UserRow } from './types'

import { formatDateTime } from '@/lib/date-utils'
export { formatDateTime }

export function getInitials(name: string | null): string {
  if (!name) return 'US'
  const parts = name
    .split(' ')
    .map(part => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return 'US'
  return parts.join('').toUpperCase()
}

export function displayName(row: UserRow): string {
  const name = row.full_name?.trim()
  if (name) return name
  const email = row.email?.trim()
  if (email) return email
  return row.id
}

export function normalizeSearchValue(value: string | null | undefined): string {
  return value?.toLowerCase() ?? ''
}
