import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { assertSameOrigin } from '@/lib/csrf'

type CallbackEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED'

type CallbackPayload = {
  event?: CallbackEvent
  session?: {
    access_token?: string | null
    refresh_token?: string | null
  } | null
}

// Maximum reasonable JWT token size (8KB)
const MAX_TOKEN_LENGTH = 8192

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function isValidToken(token: unknown): token is string {
  return typeof token === 'string' && token.length > 0 && token.length <= MAX_TOKEN_LENGTH
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req)
  } catch (error) {
    const err = error as { status?: number } | null
    const status = typeof err?.status === 'number' ? (err?.status as number) : 403
    return badRequest('Cross-site requests are not allowed.', status)
  }

  let body: CallbackPayload
  try {
    body = (await req.json()) as CallbackPayload
  } catch {
    return badRequest('Invalid JSON payload.')
  }

  const event = body.event
  if (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED' && event !== 'SIGNED_OUT') {
    return badRequest('Unsupported auth event.')
  }

  const jar = await cookies()
  const set = (name: string, value: string, maxAge: number) =>
    jar.set({
      name,
      value,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge,
      secure: process.env.NODE_ENV === 'production',
    })

  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    const access = body.session?.access_token
    const refresh = body.session?.refresh_token
    if (!isValidToken(access) || !isValidToken(refresh)) {
      return badRequest('Session tokens missing or invalid.')
    }
    set('sb-access-token', access, 60 * 60 * 24 * 7)
    set('sb-refresh-token', refresh, 60 * 60 * 24 * 30)
  }

  if (event === 'SIGNED_OUT') {
    set('sb-access-token', '', 0)
    set('sb-refresh-token', '', 0)
  }

  return NextResponse.json({ ok: true })
}
