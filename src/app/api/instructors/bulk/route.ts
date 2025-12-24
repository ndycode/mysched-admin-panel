import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sbService } from '@/lib/supabase-service'
import { requireAdmin } from '@/lib/authz'
import { audit, auditError } from '@/lib/audit'
import { throttle } from '@/lib/rate'
import { assertSameOrigin } from '@/lib/csrf'
import { getClientIp } from '@/lib/request'
import { logErr } from '@/lib/log'

const BulkDeleteSchema = z.object({
    ids: z.array(z.string().uuid()).min(1).max(100),
})

const BulkPatchSchema = z.object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    department: z.string().min(1).max(100),
})

// DELETE /api/instructors/bulk - Bulk delete instructors
export async function DELETE(req: NextRequest) {
    try {
        const admin = await requireAdmin()
        assertSameOrigin(req)
        await throttle(getClientIp(req), { windowMs: 60_000, limit: 20 })

        const body = await req.json()
        const parsed = BulkDeleteSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 })
        }

        const { ids } = parsed.data
        const sb = sbService()

        const { error, count } = await sb
            .from('instructors')
            .delete()
            .in('id', ids)

        if (error) {
            logErr('/api/instructors/bulk DELETE', error, { ids })
            return NextResponse.json({ error: 'Failed to delete instructors' }, { status: 500 })
        }

        // Audit each deletion
        await Promise.all(
            ids.map(id => audit(admin.id, 'instructors', 'delete', id, { details: { bulk: true } }))
        )

        return NextResponse.json({ ok: true, deleted: count ?? ids.length })
    } catch (error) {
        const msg = logErr('/api/instructors/bulk DELETE', error)
        await auditError('system', 'instructors', msg)
        const status = (error as { status?: number })?.status ?? 500
        return NextResponse.json({ error: 'Failed to delete instructors' }, { status })
    }
}

// PATCH /api/instructors/bulk - Bulk update instructors (e.g., set department)
export async function PATCH(req: NextRequest) {
    try {
        const admin = await requireAdmin()
        assertSameOrigin(req)
        await throttle(getClientIp(req), { windowMs: 60_000, limit: 20 })

        const body = await req.json()
        const parsed = BulkPatchSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 })
        }

        const { ids, department } = parsed.data
        const sb = sbService()

        const { error, count } = await sb
            .from('instructors')
            .update({ department })
            .in('id', ids)

        if (error) {
            logErr('/api/instructors/bulk PATCH', error, { ids, department })
            return NextResponse.json({ error: 'Failed to update instructors' }, { status: 500 })
        }

        // Audit each update
        await Promise.all(
            ids.map(id => audit(admin.id, 'instructors', 'update', id, { details: { department, bulk: true } }))
        )

        return NextResponse.json({ ok: true, updated: count ?? ids.length })
    } catch (error) {
        const msg = logErr('/api/instructors/bulk PATCH', error)
        await auditError('system', 'instructors', msg)
        const status = (error as { status?: number })?.status ?? 500
        return NextResponse.json({ error: 'Failed to update instructors' }, { status })
    }
}
