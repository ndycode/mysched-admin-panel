import { NextResponse, type NextRequest } from 'next/server'

import type { AdminUser } from './authz'
import { requireAdmin } from './authz'
import { audit, auditError, type AuditOptions } from './audit'
import { assertSameOrigin } from './csrf'
import { createHttpError, httpErrorBody, isHttpError } from './http-error'
import { logErr } from './log'
import { getClientIp } from './request'
import { throttle } from './rate'

type GuardRateConfig = {
  windowSec?: number
  limit?: number
}

type GuardOptions = {
  roles?: string[]
  origin?: boolean
  rate?: GuardRateConfig
  audit?: boolean
}

type AuditEntry = {
  table: string
  action: 'insert' | 'update' | 'delete'
  id: number | string
  details?: AuditOptions['details']
  before?: AuditOptions['before']
  after?: AuditOptions['after']
}

type GuardHelpers = {
  admin: AdminUser
  json: <T>(data: T, status?: number) => NextResponse<T>
  audit: (entry: AuditEntry) => Promise<void>
  auditError: (table: string, message: string, details?: unknown) => Promise<void>
}

type RouteHandler<TParams> = (
  req: NextRequest,
  context: { params: TParams },
  helpers: GuardHelpers,
) => Promise<Response> | Response

function applySecurityHeaders<T extends Response>(response: T): T {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'same-origin')
  return response
}

function respondWithError(error: ReturnType<typeof createHttpError>) {
  const res = NextResponse.json(httpErrorBody(error), { status: error.status })
  return applySecurityHeaders(res)
}

function toHttpError(error: unknown, req: NextRequest): ReturnType<typeof createHttpError> {
  if (isHttpError(error)) {
    return error
  }
  const msg = logErr(req.nextUrl.pathname, error, { method: req.method })
  return createHttpError(500, 'internal_error', msg || 'Internal Server Error')
}

export function withGuard<TParams>(
  options: GuardOptions,
  handler: RouteHandler<TParams>,
): (req: NextRequest, context: { params: TParams }) => Promise<Response> {
  const shouldAudit = options.audit === true
  return async (req, context) => {
    let admin: AdminUser | null = null
    try {
      if (options.origin) {
        assertSameOrigin(req)
      }

      if (options.rate) {
        const rateConfig: { windowMs?: number; limit?: number } = {}
        if (typeof options.rate.windowSec === 'number') {
          rateConfig.windowMs = Math.max(0, options.rate.windowSec) * 1000
        }
        if (typeof options.rate.limit === 'number') {
          rateConfig.limit = options.rate.limit
        }
        await throttle(getClientIp(req), rateConfig)
      }

      const roles = (options.roles ?? ['admin']).map(role => role.toLowerCase())
      if (roles.length === 0) {
        throw createHttpError(500, 'invalid_guard_configuration', 'withGuard requires at least one role')
      }
      const unsupported = roles.filter(role => role !== 'admin')
      if (unsupported.length > 0) {
        throw createHttpError(500, 'unsupported_guard_role', {
          message: `Unsupported roles requested: ${unsupported.join(', ')}`,
        })
      }
      admin = await requireAdmin()

      const json = <T>(data: T, status = 200) => applySecurityHeaders(NextResponse.json(data, { status }))

      const helpers: GuardHelpers = {
        admin,
        json,
        audit: async ({ table, action, id, details, before, after }) => {
          if (!shouldAudit) return
          await audit(admin!.id, table, action, id, {
            details,
            before,
            after,
          })
        },
        auditError: async (table, message, details) => {
          if (!shouldAudit) return
          await auditError(admin!.id, table, message, details)
        },
      }

      const response = await handler(req, context, helpers)
      return applySecurityHeaders(response)
    } catch (error) {
      const httpError = toHttpError(error, req)
      if (shouldAudit && httpError.status >= 500) {
        const actor = admin?.id ?? 'system'
        await auditError(actor, 'system', httpError.message, httpError.details)
      }
      return respondWithError(httpError)
    }
  }
}
