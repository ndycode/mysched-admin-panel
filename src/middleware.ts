import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

import { getSupabaseBrowserConfig } from '@/lib/env'
import { sbService } from '@/lib/supabase-service'

const PROTECTED = ['/admin', '/api']
const PUBLIC_ROUTES = ['/api/env-status', '/api/supabase/env-status']

const normalizePathname = (pathname: string) => {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (withLeadingSlash === '/') return withLeadingSlash
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, '')
  return withoutTrailingSlash.length > 0 ? withoutTrailingSlash : '/'
}

const matchesRoute = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(route + '/')

const protects = (normalizedPathname: string) => {
  if (PUBLIC_ROUTES.some(route => matchesRoute(normalizedPathname, route))) return false
  return PROTECTED.some(route => matchesRoute(normalizedPathname, route))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const normalizedPathname = normalizePathname(pathname)
  if (!protects(normalizedPathname)) return NextResponse.next()

  let supabaseUrl: string
  let supabaseAnonKey: string
  try {
    const config = getSupabaseBrowserConfig()
    supabaseUrl = config.url
    supabaseAnonKey = config.anon
  } catch (error) {
    console.error({ route: 'middleware', msg: 'Supabase public config unavailable', error })
    return NextResponse.redirect(new URL('/login?reason=server-misconfig', req.url))
  }

  const res = NextResponse.next()
  const cookiesAdapter = {
    get: (name: string) => req.cookies.get(name)?.value,
    getAll: () => req.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
    set: (name: string, value: string, options?: CookieOptions) =>
      res.cookies.set(name, value, options),
    remove: (name: string, options?: CookieOptions) =>
      res.cookies.set(name, '', { ...(options || {}), maxAge: 0 }),
  }

  const sb = createServerClient(supabaseUrl, supabaseAnonKey, { cookies: cookiesAdapter })
  const { data } = await sb.auth.getUser()
  if (!data?.user) {
    const to = new URL('/login', req.url)
    to.searchParams.set('reason', 'unauthorized')
    return NextResponse.redirect(to)
  }

  const isAdminRoute =
    normalizedPathname === '/admin' || normalizedPathname.startsWith('/admin/')
  const allowAnyAuth = process.env.ALLOW_ANY_AUTH_AS_ADMIN === 'true'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE

  if (isAdminRoute && !allowAnyAuth) {
    if (!serviceRoleKey) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          'Skipping admin membership check in middleware because SUPABASE_SERVICE_ROLE is not configured.',
        )
        return res
      }

      const to = new URL('/login', req.url)
      to.searchParams.set('reason', 'server-misconfig')
      return NextResponse.redirect(to)
    }

    try {
      const svc = sbService()
      const { data: adminRow, error } = await svc
        .from('admins')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle()
      if (error || !adminRow) {
        const to = new URL('/login', req.url)
        to.searchParams.set('reason', 'forbidden')
        return NextResponse.redirect(to)
      }
    } catch {
      const to = new URL('/login', req.url)
      to.searchParams.set('reason', 'forbidden')
      return NextResponse.redirect(to)
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
