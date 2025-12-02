import { ensureEnv } from './core'

export function getSiteAllowList(): string[] {
  const { cache } = ensureEnv()
  const allow = new Set<string>()
  if (cache.siteUrl) {
    try {
      allow.add(new URL(cache.siteUrl).host.toLowerCase())
    } catch {}
  }
  for (const entry of cache.siteUrls) {
    try {
      allow.add(new URL(entry).host.toLowerCase())
    } catch {}
  }
  return Array.from(allow)
}
