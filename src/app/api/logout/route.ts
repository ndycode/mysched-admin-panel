import { NextResponse } from 'next/server'
import { logErr } from '@/lib/log'
import { auditError } from '@/lib/audit'
import { sbServer } from '@/lib/supabase-server'

/**
 * POST /api/logout
 * Clears Supabase auth cookie and redirects to /login.
 */
export async function POST(request: Request) {
  try {
    const sb = await sbServer()
    await sb.auth.signOut()
    const redirectTo = new URL('/login', request.url)
    const res = NextResponse.redirect(redirectTo, { status: 302 })
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'same-origin')
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (e) {
    const msg = logErr('/api/logout POST', e, {})
    await auditError('system', 'logout', msg)
    const res = NextResponse.json({ error: msg || 'Internal Server Error' }, { status: 500 })
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'same-origin')
    res.headers.set('Cache-Control', 'no-store')
    return res
  }
}
