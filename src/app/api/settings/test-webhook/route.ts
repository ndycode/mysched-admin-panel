import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/authz'
import { auditError } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/csrf'
import { extractStatus } from '@/lib/api-error'
import { getClientIp } from '@/lib/request'
import { throttle } from '@/lib/rate'
import { logErr } from '@/lib/log'

const PayloadSchema = z.object({
  endpoint: z.string().url(),
})

function respond<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  res.headers.set('Cache-Control', 'no-store')
  return res
}

function isSupportedProtocol(url: URL) {
  return url.protocol === 'https:' || url.protocol === 'http:'
}

export async function POST(req: NextRequest) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    await requireAdmin()

    const parsed = PayloadSchema.safeParse(await req.json())
    if (!parsed.success) {
      return respond({ ok: false, error: 'Provide a valid webhook endpoint URL.' }, 400)
    }

    const url = new URL(parsed.data.endpoint)
    if (!isSupportedProtocol(url)) {
      return respond({ ok: false, error: 'Only HTTP and HTTPS webhook endpoints are supported.' }, 400)
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const start = Date.now()

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'mysched-admin-webhook-check/1.0',
        },
        body: JSON.stringify({
          type: 'admin.webhook.verify',
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      })

      const latencyMs = Date.now() - start
      if (!response.ok) {
        return respond(
          {
            ok: false,
            error: `Webhook responded with status ${response.status}.`,
            status: response.status,
          },
          502,
        )
      }

      return respond({ ok: true, status: response.status, latencyMs, checkedAt: new Date().toISOString() })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return respond({ ok: false, error: 'Webhook did not respond in time.' }, 504)
    }

    const status = extractStatus(error)
    if (status === 429) {
      return respond({ ok: false, error: 'Too many attempts. Wait and try again.' }, 429)
    }
    if (status === 403) {
      return respond({ ok: false, error: 'Request origin is not allowed.' }, 403)
    }
    if (status === 401) {
      return respond({ ok: false, error: 'Authentication required.' }, 401)
    }

    const msg = logErr('/api/settings/test-webhook POST', error)
    try {
      await auditError('system', 'admin_settings', msg, { route: 'test-webhook' })
    } catch (auditErr) {
      logErr('Failed to record audit error for test-webhook', auditErr)
    }
    return respond({ ok: false, error: msg || 'Unable to verify webhook.' }, 500)
  }
}
