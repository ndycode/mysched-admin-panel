import { NextResponse } from 'next/server'
import { sbService } from '@/lib/supabase-service'
import { withGuard } from '@/lib/with-guard'

type ServiceClient = ReturnType<typeof sbService>

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue }

/** Utility: Safe count on a table. */
async function safeCount(client: ServiceClient, table: string) {
  try {
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true })
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

/** Utility: Get most recent update timestamp. */
async function safeLastUpdate(client: ServiceClient, table: string): Promise<string | null> {
  try {
    const { data, error } = await client
      .from(table)
      .select('updated_at,created_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .single()
    if (error || !data) return null
    const rec = data as { updated_at?: string | null; created_at?: string | null }
    return rec.updated_at ?? rec.created_at ?? null
  } catch {
    return null
  }
}

/**
 * GET /api/status
 * Returns env + DB health and current user + admin status.
 */
export const GET = withGuard({}, async (_req, _context, helpers) => {
    const admin = helpers.admin
    const service = sbService()
    let latencyMs = 0
    let ok = true
    let authOk = true

    const env = {
      nodeEnv: process.env.NODE_ENV || 'development',
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE),
      hasSiteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    }

    // DB ping
    try {
      const t0 = Date.now()
      const ping = await service.from('sections').select('*', { count: 'exact', head: true })
      latencyMs = Date.now() - t0
      if (ping.error) ok = false
    } catch {
      ok = false
    }

    // Schema/auth table availability
    try {
      const authPing = await service.from('admins').select('user_id', { head: true, count: 'exact' }).limit(0)
      if (authPing.error) authOk = false
    } catch {
      authOk = false
    }

    const [classesCount, sectionsCount, errorsCount] = await Promise.all([
      safeCount(service, 'classes'),
      safeCount(service, 'sections'),
      safeCount(service, 'audit_log'),
    ])

    const [classesUpdated, sectionsUpdated] = await Promise.all([
      safeLastUpdate(service, 'classes'),
      safeLastUpdate(service, 'sections'),
    ])

    let recentErrors: Array<{ id: number; table_name: string | null; message?: string | null; created_at: string | null }> = []
    try {
      const { data } = await service
        .from('audit_log')
        .select('id, table_name, details, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

      recentErrors = (data || [])
        .map(rec => {
          const r = rec as Record<string, JsonValue>
          let message: string | null = null
          const detailsVal = r.details
          if (detailsVal && typeof detailsVal === 'object' && !Array.isArray(detailsVal)) {
            const obj = detailsVal as Record<string, JsonValue>
            const m = obj.message || obj.error
            if (typeof m === 'string') message = m
          }
          return {
            id: typeof r.id === 'number' ? r.id : Number(r.id),
            table_name: typeof r.table_name === 'string' ? r.table_name : null,
            message,
            created_at: typeof r.created_at === 'string' ? r.created_at : null,
          }
        })
        .filter(x => x.message)
        .slice(0, 5)
    } catch {}

    const payload = {
      db: { ok, latencyMs },
      auth: { ok: authOk, authed: true, userId: admin.id, isAdmin: true },
      counts: { classes: classesCount, sections: sectionsCount, errors: errorsCount },
      lastUpdate: { classes: classesUpdated, sections: sectionsUpdated },
      recentErrors,
      hasUrl: env.hasSupabaseUrl,
      hasKey: env.hasSupabaseAnon,
      env: { ...env, supabaseEnvOk: env.hasSupabaseUrl && env.hasSupabaseAnon },
    }

    const res = NextResponse.json(payload, { status: 200 })
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('Referrer-Policy', 'same-origin')
    res.headers.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=30')
    return res
})
