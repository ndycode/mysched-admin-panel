import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { getSupabaseBrowserConfig } from './env'

// Next.js blocks cookie mutation in Server Components; trySet makes writes best-effort
function trySet(fn: () => void) {
  try {
    fn()
  } catch {
    // swallow; route handlers/server actions can still mutate cookies
  }
}

export const sbServer = async () => {
  const { url: supabaseUrl, anon: supabaseAnonKey } = getSupabaseBrowserConfig()
  const store = await cookies()

  const cookieAdapter = {
    get: (name: string) => store.get(name)?.value,
    getAll: () => store.getAll().map(c => ({ name: c.name, value: c.value })),
    set: (name: string, value: string, options?: CookieOptions) => {
      trySet(() => store.set({ name, value, ...(options || {}) }))
    },
    remove: (name: string, options?: CookieOptions) => {
      trySet(() => store.set({ name, value: '', ...(options || {}), maxAge: 0 }))
    },
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, { cookies: cookieAdapter })
}
