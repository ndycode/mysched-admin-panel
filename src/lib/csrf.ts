// src/lib/csrf.ts
import type { NextRequest } from 'next/server'

import { getSiteAllowList } from './env'
import { createHttpError } from './http-error'

/**
 * Accepts requests that are same-origin (by host) or match an allowed origin list.
 * Works across localhost, Vercel preview, and prod custom domains.
 * 
 * Security notes:
 * - Origin header is preferred and more reliable than Referer
 * - Some browsers/privacy extensions strip these headers, so we allow
 *   requests without both headers for GET (safe methods) but this function
 *   should be used for state-changing operations where headers should exist
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

  // Check Origin header first (most reliable for POST/PUT/DELETE)
  const origin = req.headers.get('origin')
  if (origin) {
    try {
      const originUrl = new URL(origin)
      const oh = originUrl.host.toLowerCase()
      if (allow.has(oh)) return
      // If Origin header exists but doesn't match, reject immediately
      throw createHttpError(403, 'forbidden_origin')
    } catch (e) {
      // Re-throw our HTTP error, only catch URL parse errors
      if ((e as { status?: number })?.status === 403) throw e
    }
  }

  // Fall back to Referer (for requests without Origin header)
  const referer = req.headers.get('referer')
  if (referer) {
    try {
      const rh = new URL(referer).host.toLowerCase()
      if (allow.has(rh)) return
    } catch {
      // Invalid referer URL, continue to rejection
    }
  }

  // For mutating requests, require at least one valid header
  const method = req.method?.toUpperCase() ?? 'GET'
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (mutatingMethods.includes(method)) {
    // Mutating requests must have a valid origin or referer
    if (!origin && !referer) {
      throw createHttpError(403, 'missing_origin_header')
    }
    // If we get here, headers existed but didn't match
    throw createHttpError(403, 'forbidden_origin')
  }

  // For safe methods (GET, HEAD, OPTIONS), allow requests without headers
  // since some browsers/privacy extensions strip them
  if (!origin && !referer) {
    return // Allow safe methods without origin headers
  }

  // Headers exist but didn't match allowlist
  throw createHttpError(403, 'forbidden_origin')
}
