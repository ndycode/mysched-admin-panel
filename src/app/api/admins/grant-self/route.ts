import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { sbService } from '@/lib/supabase-service'
import { logErr } from '@/lib/log'
import { auditError, audit } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/csrf'

function jsonResponse(data: unknown, status: number) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
  // CRITICAL: This endpoint is ONLY for local development bootstrap
  // It allows any authenticated user to grant themselves admin access
  if (process.env.NODE_ENV === 'production') {
    console.error('SECURITY: Attempted to access grant-self endpoint in production')
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  // Even in development, require same-origin requests
  try {
    assertSameOrigin(req)
  } catch {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  try {
    const sb = await sbServer()
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    if (authErr || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const svc = sbService()
    // In dev, upsert current user into admins so you can proceed without manual DB steps
    const { error: insErr } = await svc
      .from('admins')
      .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
    if (insErr) {
      return jsonResponse({ error: insErr.message }, 500)
    }
    await audit(user.id, 'admins', 'insert', user.id, { details: { reason: 'bootstrap-or-upsert' } })
    return jsonResponse({ ok: true, bootstrap: true }, 200)
  } catch (e) {
    const msg = logErr('/api/admins/grant-self POST', e, {})
    await auditError('system', 'admins', msg)
    return jsonResponse({ error: msg || 'Internal Server Error' }, 500)
  }
}
