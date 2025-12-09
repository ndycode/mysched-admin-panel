import { NextRequest, NextResponse } from 'next/server'
import { sbService } from '@/lib/supabase-service'

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
    profiles: {
        full_name: string | null
        email: string | null
        avatar_url: string | null
    } | null
    classes: {
        id: number
        title: string | null
        code: string | null
        room: string | null
        day: string | null
        start: string | null
        end: string | null
    } | null
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const limit = Math.min(Number(searchParams.get('limit')) || 100, 500)

        const sb = sbService()
        let query = sb
            .from('class_issue_reports')
            .select(`
        id,
        user_id,
        class_id,
        section_id,
        note,
        snapshot,
        status,
        created_at,
        resolution_note,
        profiles:user_id (
          full_name,
          email,
          avatar_url
        ),
        classes:class_id (
          id,
          title,
          code,
          room,
          day,
          start,
          end
        )
      `)
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

        const rows = (data as unknown as IssueReportRow[]) ?? []

        const mapped = rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            classId: row.class_id,
            sectionId: row.section_id,
            note: row.note,
            snapshot: row.snapshot,
            status: row.status,
            createdAt: row.created_at,
            resolutionNote: row.resolution_note,
            reporter: row.profiles ? {
                name: row.profiles.full_name,
                email: row.profiles.email,
                avatarUrl: row.profiles.avatar_url,
            } : null,
            classInfo: row.classes ? {
                id: row.classes.id,
                title: row.classes.title,
                code: row.classes.code,
                room: row.classes.room,
                day: row.classes.day,
                start: row.classes.start,
                end: row.classes.end,
            } : null,
        }))

        return NextResponse.json(mapped)
    } catch (err) {
        console.error('Issue reports GET error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, status, resolution_note } = body

        if (!id || !status) {
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
