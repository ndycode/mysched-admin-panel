// src/lib/rate.ts
import { createHash } from 'crypto'

import { createHttpError } from './http-error'
import { sbService } from './supabase-service'

const DEFAULT_WINDOW_MS = 15_000
const DEFAULT_LIMIT = 20

type HitRateLimitResult = {
  allowed: boolean
  count: number
  reset_at: string | null
}

function toMilliseconds(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  return fallback
}

function toLimit(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  return fallback
}

function stripZoneId(host: string): string {
  const zoneIndex = host.indexOf('%')
  return zoneIndex === -1 ? host : host.slice(0, zoneIndex)
}

function stripPort(host: string): string {
  const ipv6Match = /^\[(.*)\]:(\d+)$/.exec(host)
  if (ipv6Match) {
    return ipv6Match[1]
  }

  const candidate = host.replace(/^[\[]|[\]]$/g, '')
  const portMatch = /^(.*?)(?::(\d+))$/.exec(candidate)
  if (portMatch) {
    const base = portMatch[1]
    const port = portMatch[2]
    if (base.includes('.') || base.startsWith('::ffff:')) {
      return base
    }
    if (!base.includes(':') && port.length > 0) {
      return base
    }
  }

  return candidate
}

function normalizeIp(value: string): string {
  const trimmed = value.trim().replace(/^"|"$/g, '')
  if (!trimmed) return ''

  const withoutPort = stripPort(trimmed)
  return stripZoneId(withoutPort)
}

function isLocalAddress(value: string): boolean {
  const normalized = normalizeIp(value).toLowerCase()
  if (!normalized) return true
  if (normalized === '0') return true
  if (normalized === 'localhost') return true
  if (normalized === '127.0.0.1') return true
  if (normalized === '::1') return true
  if (normalized === '0:0:0:0:0:0:0:1') return true
  if (normalized.startsWith('::ffff:127.0.0.1')) return true
  return false
}

function rateLimitFailure(reason: string, error?: unknown): never {
  const detail = reason || 'Rate limiting is unavailable.'
  console.error({ route: 'rate', msg: detail, error })
  throw createHttpError(500, 'rate_limit_unavailable', detail)
}

export async function throttle(
  ip: string | null | undefined,
  options?: { windowMs?: number; limit?: number },
): Promise<void> {
  if (!ip || isLocalAddress(ip)) {
    return
  }

  const windowMs = toMilliseconds(options?.windowMs, DEFAULT_WINDOW_MS)
  const limit = toLimit(options?.limit, DEFAULT_LIMIT)

  const fingerprint = createHash('sha256').update(ip).digest('hex')
  let client

  try {
    client = sbService()
  } catch (error) {
    rateLimitFailure('Rate limiting disabled: service client unavailable.', error)
  }

  let result: { data: unknown; error: unknown } | null = null

  try {
    result = await client.rpc('hit_rate_limit', {
      p_fingerprint: fingerprint,
      p_window_ms: windowMs,
      p_limit: limit,
    })
  } catch (error) {
    const message = (error as { message?: string } | null)?.message ?? ''
    if (message.toLowerCase().includes('could not find the function')) {
      console.warn('Rate limiting disabled: RPC function missing.')
      return
    }
    rateLimitFailure('Rate limiting disabled: RPC invocation failed.', error)
  }

  if (!result) {
    return
  }

  if (result.error) {
    const message = (result.error as { message?: string } | null)?.message ?? ''
    if (message.toLowerCase().includes('could not find the function')) {
      console.warn('Rate limiting disabled: RPC function missing.')
      return
    }
    rateLimitFailure('Rate limiting disabled: RPC returned an error.', result.error)
  }

  const payload = (Array.isArray(result.data) ? result.data[0] : result.data) as
    | HitRateLimitResult
    | null

  if (!payload) {
    rateLimitFailure('Rate limiting disabled: RPC returned no payload.')
  }

  if (!payload.allowed) {
    throw createHttpError(429, 'rate_limited', { resetAt: payload.reset_at })
  }
}
