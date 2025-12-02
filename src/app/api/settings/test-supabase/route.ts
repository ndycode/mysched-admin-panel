import { NextRequest, NextResponse } from 'next/server'

import { throttle } from '@/lib/rate'
import { assertSameOrigin } from '@/lib/csrf'
import { requireAdmin } from '@/lib/authz'
import { auditError } from '@/lib/audit'
import { sbService } from '@/lib/supabase-service'
import { logErr } from '@/lib/log'
import { getClientIp } from '@/lib/request'
import { extractStatus } from '@/lib/api-error'
import { createHttpError } from '@/lib/http-error'

function respond<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  res.headers.set('Cache-Control', 'no-store')
  return res
}

function canUseServiceClient() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE)
}

export async function POST(req: NextRequest) {
  try {
    await throttle(getClientIp(req))
    assertSameOrigin(req)
    await requireAdmin()

    if (!canUseServiceClient()) {
      return respond({ ok: false, error: 'Supabase credentials are not configured.' }, 503)
    }

    const start = Date.now()
    const { error } = await sbService()
      .from('sections')
      .select('id', { head: true, count: 'exact' })
      .limit(1)

    const latencyMs = Date.now() - start
    if (error) {
      throw createHttpError(500, error.message || 'Failed to reach Supabase', error)
    }

    return respond({ ok: true, latencyMs })
  } catch (error) {
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

    const msg = logErr('/api/settings/test-supabase POST', error)
    try {
      await auditError('system', 'admin_settings', msg, { route: 'test-supabase' })
    } catch (auditErr) {
      logErr('Failed to record audit error for test-supabase', auditErr)
    }
    return respond({ ok: false, error: msg || 'Unable to verify Supabase connection.' }, 500)
  }
}
