import type { User } from '@supabase/supabase-js'
import { z } from 'zod'

export const ROLE_VALUES = ['admin', 'instructor', 'student'] as const
export const STATUS_VALUES = ['active', 'inactive', 'suspended'] as const

export const RoleEnum = z.enum(ROLE_VALUES)
export const StatusEnum = z.enum(STATUS_VALUES)

export const PROFILE_COLUMNS = 'id,full_name,student_id,email,app_user_id,avatar_url'

export type ProfileRow = {
  id: string
  full_name: string | null
  student_id?: string | null
  email: string | null
  app_user_id?: number | null
  avatar_url: string | null
}

export type UserRow = {
  id: string
  email: string | null
  full_name: string | null
  student_id: string | null
  app_user_id: number | null
  created_at: string | null
  last_sign_in_at: string | null
  providers: string[]
  avatar_url: string | null
  role: (typeof ROLE_VALUES)[number]
  status: (typeof STATUS_VALUES)[number]
}

const ROLE_PRIORITY: Array<(typeof ROLE_VALUES)[number]> = ['admin', 'instructor', 'student']

function toLowerString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed.toLowerCase() : null
}

function parseRole(value: unknown): (typeof ROLE_VALUES)[number] | null {
  const str = toLowerString(value)
  if (!str) return null
  if (str === 'admin' || str === 'administrator') return 'admin'
  if (str === 'instructor' || str === 'teacher' || str === 'professor') return 'instructor'
  if (str === 'student' || str === 'learner') return 'student'
  return null
}

function normalizeRoleCandidates(value: unknown): (typeof ROLE_VALUES)[number][] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map(parseRole)
      .filter((role): role is (typeof ROLE_VALUES)[number] => Boolean(role))
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(parseRole)
      .filter((role): role is (typeof ROLE_VALUES)[number] => Boolean(role))
  }
  return []
}

export function deriveRole(
  user: User,
  profile?: ProfileRow | null,
  adminIds?: Set<string>
): (typeof ROLE_VALUES)[number] {
  if (adminIds?.has(user.id)) {
    return 'admin'
  }
  const meta: Record<string, unknown> = {
    ...(user.app_metadata ?? {}),
    ...(user.user_metadata ?? {}),
  }

  const directSources: unknown[] = [
    meta['role'],
    meta['primary_role'],
    meta['user_role'],
    (profile as { role?: unknown } | null)?.role,
  ]

  const arraySources: unknown[] = [meta['roles'], meta['user_roles'], meta['permissions'], meta['groups']]

  const candidates = new Set<(typeof ROLE_VALUES)[number]>([
    ...directSources
      .map(parseRole)
      .filter((role): role is (typeof ROLE_VALUES)[number] => Boolean(role)),
    ...arraySources.flatMap(normalizeRoleCandidates),
  ])

  for (const role of ROLE_PRIORITY) {
    if (candidates.has(role)) return role
  }

  return 'student'
}

function parseStatus(value: unknown): (typeof STATUS_VALUES)[number] | null {
  const str = toLowerString(value)
  if (!str) return null
  if (str === 'active') return 'active'
  if (str === 'inactive' || str === 'disabled' || str === 'deactivated') return 'inactive'
  if (str === 'suspended' || str === 'banned' || str === 'blocked') return 'suspended'
  return null
}

export function deriveStatus(user: User, profile?: ProfileRow | null): (typeof STATUS_VALUES)[number] {
  const meta: Record<string, unknown> = {
    ...(user.app_metadata ?? {}),
    ...(user.user_metadata ?? {}),
  }

  const directSources: unknown[] = [
    meta['status'],
    meta['user_status'],
    meta['account_status'],
    (profile as { status?: unknown } | null)?.status,
  ]

  for (const value of directSources) {
    const parsed = parseStatus(value)
    if (parsed) return parsed
  }

  const bannedUntil = toLowerString((user as { banned_until?: string | null }).banned_until ?? null)
  if (bannedUntil) {
    const date = new Date(bannedUntil)
    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) {
      return 'suspended'
    }
  }

  const lastSignIn = user.last_sign_in_at
  if (typeof lastSignIn === 'string') {
    const date = new Date(lastSignIn)
    if (!Number.isNaN(date.getTime())) {
      const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays > 90) {
        return 'inactive'
      }
    }
  }

  const emailConfirmed = (user.email_confirmed_at ?? null) as string | null
  if (!emailConfirmed) {
    return 'inactive'
  }

  return 'active'
}

export function deriveAvatarUrl(user: User, profile?: ProfileRow | null): string | null {
  const profileUrl = typeof profile?.avatar_url === 'string' ? profile.avatar_url : null
  if (profileUrl) return profileUrl
  const meta: Record<string, unknown> = {
    ...(user.user_metadata ?? {}),
    ...(user.app_metadata ?? {}),
  }
  const metaUrl =
    (typeof meta['avatar_url'] === 'string' && meta['avatar_url'].trim().length
      ? String(meta['avatar_url'])
      : null) ||
    (typeof meta['avatar'] === 'string' && meta['avatar'].trim().length ? String(meta['avatar']) : null)
  return metaUrl ?? null
}

export function toDto(user: User, profile?: ProfileRow | null, adminIds?: Set<string>): UserRow {
  const providers = user.identities?.map((i) => i.provider ?? 'unknown').filter(Boolean) ?? []
  const profileAppUser = typeof profile?.app_user_id === 'number' ? profile.app_user_id : null
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? null,
    full_name: (profile?.full_name ?? (user.user_metadata?.full_name as string | null)) ?? null,
    student_id: (profile?.student_id ?? (user.user_metadata?.student_id as string | null)) ?? null,
    app_user_id: profileAppUser,
    created_at: user.created_at ?? null,
    last_sign_in_at: user.last_sign_in_at ?? null,
    providers,
    avatar_url: deriveAvatarUrl(user, profile),
    role: deriveRole(user, profile, adminIds),
    status: deriveStatus(user, profile),
  }
}
