import { sbService } from '@/lib/supabase-service'

const REDACTED = '[REDACTED]'
const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'oldpassword',
  'passcode',
  'secret',
  'token',
  'apikey',
  'accesstoken',
  'refreshtoken',
  'sessiontoken',
  'credential',
  'authorization',
  'bearer',
  'jwt',
  'privatekey',
  'secretkey',
  'encryptionkey',
  'ssn',
  'socialsecurity',
  'creditcard',
  'cardnumber',
  'cvv',
  'cvc',
  'pin',
  // Additional authentication tokens
  'authtoken',
  'otp',
  'totp',
  '2facode',
  'twofactorcode',
  'backupcode',
  'recoverycode',
  'resettoken',
  'verificationcode',
  'magiclink',
  // Additional payment/financial
  'accountnumber',
  'routingnumber',
  'iban',
  'swift',
  // Additional personal identifiers
  'driverslicense',
  'passportnumber',
  'taxid',
])

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (Object.prototype.toString.call(value) !== '[object Object]') return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

function shouldRedact(key: string): boolean {
  return SENSITIVE_KEYS.has(normalizeKey(key))
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry))
  }
  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value)) {
      next[key] = shouldRedact(key) ? REDACTED : sanitizeValue(nested)
    }
    return next
  }
  return value
}

export function sanitizeAuditDetails(details: unknown): unknown {
  if (details === undefined || details === null) return details
  return sanitizeValue(details)
}

type AuditAction = 'insert' | 'update' | 'delete'

export type AuditOptions = {
  details?: unknown
  before?: unknown
  after?: unknown
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aEntries = Object.keys(a)
    const bEntries = Object.keys(b)
    if (aEntries.length !== bEntries.length) return false
    for (const key of aEntries) {
      if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false
    }
    return true
  }
  return false
}

function computeChanges(before: unknown, after: unknown) {
  const beforeObj = isPlainObject(before) ? (sanitizeValue(before) as Record<string, unknown>) : undefined
  const afterObj = isPlainObject(after) ? (sanitizeValue(after) as Record<string, unknown>) : undefined
  if (!beforeObj && !afterObj) return undefined

  const keys = new Set<string>([
    ...(beforeObj ? Object.keys(beforeObj) : []),
    ...(afterObj ? Object.keys(afterObj) : []),
  ])

  const diff: Record<string, Record<string, unknown>> = {}

  for (const key of keys) {
    const prev = beforeObj ? beforeObj[key] : undefined
    const next = afterObj ? afterObj[key] : undefined
    if (!deepEqual(prev, next)) {
      const entry: Record<string, unknown> = {}
      if (prev !== undefined) entry.before = prev
      if (next !== undefined) entry.after = next
      diff[key] = entry
    }
  }

  return Object.keys(diff).length > 0 ? diff : undefined
}

function normalizeAuditDetails(details: unknown): unknown {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return sanitizeAuditDetails(details)
  }

  const candidate = details as AuditOptions & Record<string, unknown>
  const hasDiffKeys = 'before' in candidate || 'after' in candidate || 'details' in candidate
  if (!hasDiffKeys) {
    return sanitizeAuditDetails(details)
  }

  const payload: Record<string, unknown> = {}

  if ('details' in candidate && candidate.details !== undefined) {
    const sanitizedDetails = sanitizeAuditDetails(candidate.details)
    if (sanitizedDetails !== undefined) payload.details = sanitizedDetails
  }

  if ('before' in candidate && candidate.before !== undefined) {
    payload.before = sanitizeAuditDetails(candidate.before)
  }

  if ('after' in candidate && candidate.after !== undefined) {
    payload.after = sanitizeAuditDetails(candidate.after)
  }

  const changes = computeChanges(candidate.before, candidate.after)
  if (changes) {
    payload.changes = changes
  }

  return Object.keys(payload).length > 0 ? payload : undefined
}

export async function audit(
  user_id: string,
  table_name: string,
  action: AuditAction,
  row_id: number | string,
  details?: unknown
) {
  try {
    const normalizedAction = action.toUpperCase()
    const normalizedTable = table_name.trim().toLowerCase()
    const sb = sbService()
    const sanitized = normalizeAuditDetails(details)

    // Skip duplicates within a short window to avoid flooding on the same action
    const now = Date.now()
    const { data: recent } = await sb
      .from('audit_log')
      .select('id, at, user_id, details')
      .eq('table_name', normalizedTable)
      .eq('row_id', row_id)
      .eq('action', normalizedAction)
      .order('id', { ascending: false })
      .limit(5)

    const windowMs = 3000
    const inWindow = (entry: { at?: string | null }) => {
      const ts = entry.at ? new Date(entry.at).getTime() : null
      return ts ? Math.abs(now - ts) <= windowMs : false
    }

    const recentInWindow = (recent ?? []).filter(inWindow)

    // For system entries: if anything already exists in-window, skip
    if (!user_id && recentInWindow.length) {
      return
    }

    const payload: Record<string, unknown> = {
      user_id,
      table_name: normalizedTable,
      action: normalizedAction,
      row_id,
    }
    if (sanitized !== undefined) {
      payload.details = sanitized
    }

    // If this is a user entry and any system rows exist, remove them first (regardless of time window)
    if (user_id) {
      await sb
        .from('audit_log')
        .delete()
        .eq('table_name', normalizedTable)
        .eq('row_id', row_id)
        .eq('action', normalizedAction)
        .is('user_id', null)
    }

    // For system entries: if anything already exists, skip
    if (!user_id) {
      const { count } = await sb
        .from('audit_log')
        .select('id', { count: 'exact', head: true })
        .eq('table_name', normalizedTable)
        .eq('row_id', row_id)
        .eq('action', normalizedAction)
      if ((count ?? 0) > 0) return
    }

    const insertResult = await sb.from('audit_log').insert([payload]).select('id, at').single()
    return insertResult
  } catch {
    // ignore
  }
}

export async function auditError(
  user_id: string,
  table_name: string,
  message: string,
  details?: unknown
) {
  try {
    const sb = sbService()
    if (!sb?.from) return

    const table = sb.from('audit_log')
    if (!table || typeof table.insert !== 'function') return

    const mergedDetails =
      typeof details === 'object' && details !== null
        ? { message, ...(details as Record<string, unknown>) }
        : { message }
    const sanitized = sanitizeAuditDetails(mergedDetails)
    await table.insert({
      user_id,
      table_name,
      action: 'error',
      details: sanitized,
    })
  } catch (err) {
    console.error('Failed to record audit error', err)
  }
}
