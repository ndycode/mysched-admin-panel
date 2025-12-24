import { NextRequest, NextResponse } from 'next/server'
import { sbService } from '@/lib/supabase-service'
import { requireAdmin } from '@/lib/authz'
import { assertSameOrigin } from '@/lib/csrf'
import { throttle } from '@/lib/rate'
import { getClientIp } from '@/lib/request'

export const dynamic = 'force-dynamic'

type IssueReportRow = {
    id: number
    user_id: string
    class_id: number
    section_id: number | null
    note: string | null
    snapshot: Record<string, unknown>
    status: string
    created_at: string
    resolution_note: string | null
}

export async function GET(request: NextRequest) {
    try {
        await requireAdmin()
        await throttle(getClientIp(request))

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const limit = Math.min(Number(searchParams.get('limit')) || 100, 500)

        const sb = sbService()
        let query = sb
            .from('class_issue_reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) {
            console.error('Failed to fetch issue reports:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const rows = (data as IssueReportRow[]) ?? []

        // Fetch class info for each report
        const classIds = [...new Set(rows.map(r => r.class_id).filter(Boolean))]
        const { data: classesData } = classIds.length > 0
            ? await sb.from('classes').select('id, title, code, room, day, start, end').in('id', classIds)
            : { data: [] }
        const classesMap = new Map((classesData ?? []).map(c => [c.id, c]))

        // Fetch profile info for each reporter
        const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
        const { data: profilesData } = userIds.length > 0
            ? await sb.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds)
            : { data: [] }
        const profilesMap = new Map((profilesData ?? []).map(p => [p.id, p]))

        const mapped = rows.map(row => {
            const profile = profilesMap.get(row.user_id)
            const classInfo = classesMap.get(row.class_id)
            return {
                id: row.id,
                userId: row.user_id,
                classId: row.class_id,
                sectionId: row.section_id,
                note: row.note,
                snapshot: row.snapshot,
                status: row.status,
                createdAt: row.created_at,
                resolutionNote: row.resolution_note,
                reporter: profile ? {
                    name: profile.full_name,
                    email: profile.email,
                    avatarUrl: profile.avatar_url,
                } : null,
                classInfo: classInfo ?? null,
            }
        })

        return NextResponse.json(mapped)
    } catch (err) {
        console.error('Issue reports GET error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        await requireAdmin()
        assertSameOrigin(request)
        await throttle(getClientIp(request))

        const body = await request.json()
        const { id, status, resolution_note } = body

        if (!id || typeof id !== 'number' || id < 1) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
        }

        if (!status) {
            return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
        }

        if (!['new', 'resolved', 'ignored'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const sb = sbService()
        const updateData: Record<string, unknown> = { status }
        if (resolution_note !== undefined) {
            updateData.resolution_note = resolution_note
        }

        const { error } = await sb
            .from('class_issue_reports')
            .update(updateData)
            .eq('id', id)

        if (error) {
            console.error('Failed to update issue report:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Issue reports PATCH error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
