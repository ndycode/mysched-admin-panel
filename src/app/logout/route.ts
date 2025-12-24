// src/app/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { sbServer } from '@/lib/supabase-server'
import { assertSameOrigin } from '@/lib/csrf'

async function performLogout(request: Request) {
  const cookieStore = await cookies()
  try {
    const sb = await sbServer()
    await sb.auth.signOut({ scope: 'local' })
  } catch (error) {
    console.error('Failed to sign out via Supabase:', error)
  }

  // Clear auth cookies with secure attributes
  const cookieOptions = {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  }
  cookieStore.set({ name: 'sb-access-token', value: '', ...cookieOptions })
  cookieStore.set({ name: 'sb-refresh-token', value: '', ...cookieOptions })

  const redirectUrl = new URL('/login', request.url)
  const response = NextResponse.redirect(redirectUrl, { status: 302 })
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
}

// POST is preferred for logout (state-mutating operation)
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return performLogout(request)
}

// Note: GET logout removed for security reasons.
// GET requests can be triggered via <img src> or link prefetch, enabling CSRF attacks.
// Use POST /logout or POST /api/logout instead.
