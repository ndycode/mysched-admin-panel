import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/authz'
import { auditError } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/csrf'
import { extractStatus } from '@/lib/api-error'
import { logErr } from '@/lib/log'
import { throttle } from '@/lib/rate'
import { getClientIp } from '@/lib/request'
import { verifyGeminiConnection } from '@/lib/ocr/schedule-ocr'

function respond<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export async function POST(req: NextRequest) {
  try {
    await throttle(getClientIp(req), { windowMs: 60_000, limit: 10 })
    assertSameOrigin(req)
    await requireAdmin()

    const { latencyMs } = await verifyGeminiConnection()
    return respond({ ok: true, latencyMs, checkedAt: new Date().toISOString() })
  } catch (error) {
    const status = extractStatus(error)
    if (status === 401) {
      return respond({ ok: false, error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return respond({ ok: false, error: 'Request origin is not allowed.' }, 403)
    }
    if (status === 429) {
      return respond({ ok: false, error: 'Too many attempts. Wait and try again.' }, 429)
    }
    if (status === 500 && (error as { code?: string } | null)?.code === 'ocr_unavailable') {
      return respond({ ok: false, error: 'OCR is not configured on this server.' }, 503)
    }
    if (status === 502 || status === 504) {
      return respond({ ok: false, error: 'OCR service is temporarily unavailable. Please retry shortly.' }, status)
    }
    if (status && status >= 400 && status < 500) {
      const message = (error as { message?: string } | null)?.message || 'Unable to verify OCR connection.'
      return respond({ ok: false, error: message }, status)
    }

    const msg = logErr('/api/classes/test-ocr POST', error)
    try {
      await auditError('system', 'classes', msg, { route: 'test-ocr' })
    } catch (auditErr) {
      logErr('Failed to record audit error for test-ocr', auditErr)
    }
    return respond({ ok: false, error: msg || 'Unable to verify OCR connection.' }, 500)
  }
}
