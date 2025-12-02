import { NextResponse } from 'next/server'
import { sbServer } from '@/lib/supabase-server'
import { logErr } from '@/lib/log'
import { auditError } from '@/lib/audit'

export async function GET() {
  try {
    const sb = await sbServer()
    const { data: { user }, error } = await sb.auth.getUser()
    const res = NextResponse.json({ user, error })
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'same-origin')
    return res
  } catch (e) {
    const msg = logErr('/api/whoami GET', e, {})
    await auditError('system', 'whoami', msg)
    const res = NextResponse.json({ error: msg || 'Internal Server Error' }, { status: 500 })
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'same-origin')
    return res
  }
}
