import { createBrowserClient } from '@supabase/ssr'

import { getSupabaseBrowserConfig } from './env'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function sbBrowser() {
  if (!browserClient) {
    const { url, anon } = getSupabaseBrowserConfig()
    browserClient = createBrowserClient(url, anon)
  }
  return browserClient
}
