'use server'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sbService } from '@/lib/supabase-service'
import { requireAdmin } from '@/lib/authz'
import { throttle } from '@/lib/rate'
import { assertSameOrigin } from '@/lib/csrf'
import { getClientIp } from '@/lib/request'

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
        await requireAdmin()
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
            console.error('Bulk delete error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true, deleted: count ?? ids.length })
    } catch (error) {
        console.error('Bulk delete error:', error)
        const status = (error as { status?: number })?.status ?? 500
        const message = (error as { message?: string })?.message ?? 'Failed to delete instructors'
        return NextResponse.json({ error: message }, { status })
    }
}

// PATCH /api/instructors/bulk - Bulk update instructors (e.g., set department)
export async function PATCH(req: NextRequest) {
    try {
        await requireAdmin()
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
            console.error('Bulk update error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true, updated: count ?? ids.length })
    } catch (error) {
        console.error('Bulk update error:', error)
        const status = (error as { status?: number })?.status ?? 500
        const message = (error as { message?: string })?.message ?? 'Failed to update instructors'
        return NextResponse.json({ error: message }, { status })
    }
}
