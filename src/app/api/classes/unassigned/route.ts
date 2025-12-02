import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/authz'
import { auditError } from '@/lib/audit'
import { extractStatus } from '@/lib/api-error'
import { createHttpError } from '@/lib/http-error'
import { logErr } from '@/lib/log'
import { sbService } from '@/lib/supabase-service'

function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'same-origin')
  return res
}

type UnassignedRow = {
  class_id: number
  code: string | null
  title: string | null
  day: string | number | null
  start: string | null
  end: string | null
  room: string | null
  section_id: number | null
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const sb = sbService()
    const { data, error } = await sb.rpc('get_unassigned_classes')

    if (error) {
      throw createHttpError(500, 'Failed to load unassigned classes.', error)
    }

    return json({ classes: (data ?? []) as UnassignedRow[] })
  } catch (e) {
    const status = extractStatus(e)
    if (status === 401) {
      return json({ error: 'Authentication required.' }, 401)
    }
    if (status === 403) {
      return json({ error: 'You do not have access to this resource.' }, 403)
    }

    const msg = logErr('/api/classes/unassigned GET', e, { method: req.method })
    await auditError('system', 'classes', msg)
    return json({ error: msg || 'Internal Server Error' }, 500)
  }
}
