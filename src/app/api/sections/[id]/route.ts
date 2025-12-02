import { NextRequest } from 'next/server'
import { createHttpError } from '@/lib/http-error'
import { sbService } from '@/lib/supabase-service'
import { requireAdmin } from '@/lib/authz'
import { audit, auditError } from '@/lib/audit'
import { extractStatus } from '@/lib/api-error'
import { logErr } from '@/lib/log'

function json<T>(data: T, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    },
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params
  try {
    await requireAdmin()
    const sb = sbService()
    const id = Number(idParam)
    if (!Number.isFinite(id)) {
      return json({ error: 'Invalid section id' }, 400)
    }

    const { error } = await sb.from('sections').delete().eq('id', id)
    if (error) {
      throw createHttpError(500, 'Failed to delete section', error)
    }

    await audit('system', 'sections', 'delete', id, { details: { id } })
    return json({ success: true })
  } catch (e) {
    const status = extractStatus(e)
    if (status === 401 || status === 403) {
      return json({ error: 'Unauthorized' }, status)
    }
    const msg = logErr('/api/sections/[id] DELETE', e, { method: 'DELETE' })
    await auditError('system', 'sections', msg)
    return json({ error: msg || 'Failed to delete section' }, 500)
  }
}
