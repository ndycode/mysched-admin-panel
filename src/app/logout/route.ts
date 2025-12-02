// src/app/logout/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { sbServer } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  try {
    const sb = await sbServer()
    await sb.auth.signOut({ scope: 'local' })
  } catch (error) {
    console.error('Failed to sign out via Supabase:', error)
  }

  cookieStore.set({ name: 'sb-access-token', value: '', path: '/', maxAge: 0 })
  cookieStore.set({ name: 'sb-refresh-token', value: '', path: '/', maxAge: 0 })

  const redirectUrl = new URL('/login', request.url)
  const response = NextResponse.redirect(redirectUrl, { status: 302 })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
