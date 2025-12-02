// src/lib/csrf.ts
import type { NextRequest } from 'next/server'

import { getSiteAllowList } from './env'
import { createHttpError } from './http-error'

/**
 * Accepts requests that are same-origin (by host) or match an allowed origin list.
 * Works across localhost, Vercel preview, and prod custom domains.
 */
export function assertSameOrigin(req: NextRequest | Request): void {
  const url = 'nextUrl' in req ? req.nextUrl : new URL(req.url)
  const reqHost = url.host.toLowerCase()

  // Build allowlist
  let allowList: string[] = []
  try {
    allowList = getSiteAllowList()
  } catch {
    allowList = []
  }
  const allow = new Set<string>([reqHost, ...allowList])

  // Check Origin, then Referer
  const origin = req.headers.get('origin')
  if (origin) {
    try {
      const oh = new URL(origin).host.toLowerCase()
      if (allow.has(oh)) return
    } catch {}
  }

  const referer = req.headers.get('referer')
  if (referer) {
    try {
      const rh = new URL(referer).host.toLowerCase()
      if (allow.has(rh)) return
    } catch {}
  }

  throw createHttpError(403, 'forbidden_origin')
}
