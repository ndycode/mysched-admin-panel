export type RawSupabaseEnv = NodeJS.ProcessEnv & {
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  NEXT_PUBLIC_SUPABASE_REFERENCE?: string
  NEXT_PUBLIC_SUPABASE_PROJECT_ID?: string
  NEXT_PUBLIC_SUPABASE_PROJECT_REF?: string
  SUPABASE_SERVICE_ROLE?: string
  SUPABASE_URL?: string
  SUPABASE_URL_PUBLIC?: string
  SUPABASE_URL_ANON?: string
  SUPABASE_PROJECT_URL?: string
  SUPABASE_PROJECT_REF?: string
  SUPABASE_PROJECT_ID?: string
  SUPABASE_REFERENCE?: string
  SUPABASE_ANON_KEY?: string
  SUPABASE_ANON?: string
  SUPABASE_PUBLIC_ANON_KEY?: string
  SUPABASE_PUBLIC_KEY?: string
  SUPABASE_ANON_KEY_B64?: string
  SUPABASE_PUBLIC_ANON_KEY_B64?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  SUPABASE_SERVICE_KEY?: string
  SUPABASE_SERVICE_ROLE_B64?: string
}

export type ResolvedSupabaseEnv = {
  url?: string
  anonKey?: string
  serviceRole?: string
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function decodeWithNodeBuffer(value: string) {
  const nodeBuffer = (globalThis as typeof globalThis & {
    Buffer?: { from(input: string, encoding: string): { toString(encoding: string): string } }
  }).Buffer
  if (!nodeBuffer) return undefined
  try {
    return nodeBuffer.from(value, 'base64').toString('utf8')
  } catch {
    return undefined
  }
}

export function decodeMaybeBase64(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length % 4 === 0
  if (!looksBase64) return trimmed

  try {
    if (typeof globalThis.atob === 'function') {
      const binary = globalThis.atob(trimmed)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
      }
      const decoded = new TextDecoder().decode(bytes).trim()
      return decoded || undefined
    }
  } catch {
    // ignored – fallback to Node Buffer logic below
  }

  try {
    const decoded = decodeWithNodeBuffer(trimmed)?.trim()
    return decoded || undefined
  } catch {
    return trimmed
  }
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

export function normalizeSupabaseUrl(value: string): string {
  let normalized = value.trim()
  if (!normalized) return normalized

  const hasProtocol = /^https?:\/\//i.test(normalized)
  const candidate = hasProtocol ? normalized : `https://${normalized}`

  try {
    const url = new URL(candidate)
    const hostname = url.hostname.toLowerCase()
    const isLocalHost = LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith('.local')
    if (!isLocalHost) {
      url.protocol = 'https:'
    }
    url.pathname = '/'
    url.search = ''
    url.hash = ''
    return url.origin
  } catch {
    if (/^http:\/\//i.test(normalized) && !/localhost|127\.0\.0\.1|::1/i.test(normalized)) {
      normalized = `https://${normalized.slice('http://'.length)}`
    } else if (!hasProtocol) {
      normalized = `https://${normalized}`
    }
    return normalized.replace(/\/+$/, '')
  }
}

export function deriveSupabaseUrl(env: RawSupabaseEnv): string | undefined {
  const direct = firstDefined(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_URL,
    env.SUPABASE_URL_PUBLIC,
    env.SUPABASE_URL_ANON,
    env.SUPABASE_PROJECT_URL,
  )
  if (direct) return normalizeSupabaseUrl(direct)

  const projectRef = firstDefined(
    env.NEXT_PUBLIC_SUPABASE_REFERENCE,
    env.NEXT_PUBLIC_SUPABASE_PROJECT_ID,
    env.NEXT_PUBLIC_SUPABASE_PROJECT_REF,
    env.SUPABASE_PROJECT_REF,
    env.SUPABASE_PROJECT_ID,
    env.SUPABASE_REFERENCE,
  )
  if (!projectRef) return undefined

  let normalized = projectRef.trim()
  if (normalized.toLowerCase().startsWith('http://')) {
    normalized = normalized.slice('http://'.length)
  } else if (normalized.toLowerCase().startsWith('https://')) {
    normalized = normalized.slice('https://'.length)
  }

  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }

  const lower = normalized.toLowerCase()
  const suffix = '.supabase.co'
  const bare = lower.endsWith(suffix)
    ? normalized.slice(0, normalized.length - suffix.length)
    : normalized

  return normalizeSupabaseUrl(`https://${bare}.supabase.co`)
}

export function deriveSupabaseAnonKey(env: RawSupabaseEnv): string | undefined {
  const direct = firstDefined(
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env.SUPABASE_ANON_KEY,
    env.SUPABASE_ANON,
    env.SUPABASE_PUBLIC_ANON_KEY,
    env.SUPABASE_PUBLIC_KEY,
  )
  if (direct) return direct

  const base64 = firstDefined(env.SUPABASE_ANON_KEY_B64, env.SUPABASE_PUBLIC_ANON_KEY_B64)
  return decodeMaybeBase64(base64)
}

export function deriveSupabaseServiceRole(env: RawSupabaseEnv): string | undefined {
  const direct = firstDefined(
    env.SUPABASE_SERVICE_ROLE,
    env.SUPABASE_SERVICE_ROLE_KEY,
    env.SUPABASE_SERVICE_KEY,
  )
  if (direct) return direct

  return decodeMaybeBase64(env.SUPABASE_SERVICE_ROLE_B64)
}

export function resolveSupabaseEnv(env: RawSupabaseEnv): ResolvedSupabaseEnv {
  return {
    url: deriveSupabaseUrl(env),
    anonKey: deriveSupabaseAnonKey(env),
    serviceRole: deriveSupabaseServiceRole(env),
  }
}
