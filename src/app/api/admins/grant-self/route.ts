import { NextRequest, NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { sbService } from '@/lib/supabase-service'
import { logErr } from '@/lib/log'
import { auditError, audit } from '@/lib/audit'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req?: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      const res = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      res.headers.set('X-Content-Type-Options', 'nosniff')
      res.headers.set('Referrer-Policy', 'same-origin')
      return res
    }

    const sb = await sbServer()
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    if (authErr || !user) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      res.headers.set('X-Content-Type-Options', 'nosniff')
      res.headers.set('Referrer-Policy', 'same-origin')
      return res
    }

    const svc = sbService()
    // In dev, upsert current user into admins so you can proceed without manual DB steps
    const { error: insErr } = await svc
      .from('admins')
      .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
    if (insErr) {
      const res = NextResponse.json({ error: insErr.message }, { status: 500 })
      res.headers.set('X-Content-Type-Options', 'nosniff')
      res.headers.set('Referrer-Policy', 'same-origin')
      return res
    }
    await audit(user.id, 'admins', 'insert', user.id, { details: { reason: 'bootstrap-or-upsert' } })
    const res = NextResponse.json({ ok: true, bootstrap: true })
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'same-origin')
    return res
  } catch (e) {
    const msg = logErr('/api/admins/grant-self POST', e, {})
    await auditError('system', 'admins', msg)
    const res = NextResponse.json({ error: msg || 'Internal Server Error' }, { status: 500 })
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'same-origin')
    return res
  }
}
