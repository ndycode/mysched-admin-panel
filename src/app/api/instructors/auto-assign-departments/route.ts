import { NextRequest, NextResponse } from 'next/server'
import { sbService } from '@/lib/supabase-service'
import { requireAdmin } from '@/lib/authz'

export const dynamic = 'force-dynamic'

// Department mapping from class code prefixes
const DEPARTMENT_MAPPINGS: Record<string, string> = {
    // Computer Studies / IT
    'CS': 'CSIT',
    'CC': 'CSIT',
    'IS': 'CSIT',
    'CSS': 'CSIT',
    'CSELEC': 'CSIT',
    'IT': 'CSIT',

    // Criminology
    'CRIM': 'Criminology',
    'FORENSIC': 'Criminology',
    'CDI': 'Criminology',
    'CLJ': 'Criminology',
    'LEA': 'Criminology',
    'CA': 'Criminology',
    'CFLM': 'Criminology',
    'CCAP': 'Criminology',

    // Tourism/Hospitality Management
    'THC': 'CTHM',
    'TPC': 'CTHM',
    'TMPE': 'CTHM',
    'TH': 'CTHM',
    'THS': 'CTHM',

    // Accountancy / Business
    'ABM': 'Accountancy',
    'ACCT': 'Accountancy',
    'ACT': 'Accountancy',

    // Education / PE
    'BPE': 'Education',
    'PE': 'Education',
    'PATHFIT': 'Education',
    'TEACH': 'Education',
    'ASSESS': 'Education',
    'ED TECH': 'Education',

    // Arts / Media / Communication
    'BMC': 'Arts & Media',
    'CM': 'Arts & Media',
    'MUSIC': 'Arts & Media',
    'FL': 'Arts & Media',

    // General Education
    'GE-': 'General Education',
    'GEC-': 'General Education',
    'C-': 'General Education',
    'NSTP': 'General Education',
    'RIZAL': 'General Education',
    'GEELEC': 'General Education',
    'ADGE': 'General Education',
}

function inferDepartment(classCodes: string[]): string | null {
    // Count department occurrences
    const deptCounts = new Map<string, number>()

    for (const code of classCodes) {
        for (const [prefix, dept] of Object.entries(DEPARTMENT_MAPPINGS)) {
            if (code.toUpperCase().startsWith(prefix.toUpperCase())) {
                deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1)
                break
            }
        }
    }

    if (deptCounts.size === 0) return null

    // Return the department with the most matches
    let maxDept: string | null = null
    let maxCount = 0
    for (const [dept, count] of deptCounts) {
        if (count > maxCount) {
            maxCount = count
            maxDept = dept
        }
    }

    return maxDept
}

export async function POST(req: NextRequest) {
    try {
        await requireAdmin()

        const sb = sbService()

        // Get all instructors without departments
        const { data: instructors, error: instError } = await sb
            .from('instructors')
            .select('id, full_name, department')
            .is('department', null)

        if (instError) {
            console.error('Failed to fetch instructors:', instError)
            return NextResponse.json({ error: instError.message }, { status: 500 })
        }

        if (!instructors || instructors.length === 0) {
            return NextResponse.json({
                message: 'All instructors already have departments assigned',
                updated: 0
            })
        }

        // Get all classes with instructor_id
        const { data: classes, error: classError } = await sb
            .from('classes')
            .select('instructor_id, code')
            .not('instructor_id', 'is', null)

        if (classError) {
            console.error('Failed to fetch classes:', classError)
            return NextResponse.json({ error: classError.message }, { status: 500 })
        }

        // Group classes by instructor
        const instructorClasses = new Map<string, string[]>()
        for (const c of classes ?? []) {
            if (!c.instructor_id || !c.code) continue
            if (!instructorClasses.has(c.instructor_id)) {
                instructorClasses.set(c.instructor_id, [])
            }
            instructorClasses.get(c.instructor_id)!.push(c.code)
        }

        // Determine department for each instructor
        const updates: { id: string, department: string }[] = []
        for (const inst of instructors) {
            const codes = instructorClasses.get(inst.id) ?? []
            if (codes.length === 0) continue

            const dept = inferDepartment(codes)
            if (dept) {
                updates.push({ id: inst.id, department: dept })
            }
        }

        if (updates.length === 0) {
            return NextResponse.json({
                message: 'No instructors could be matched to departments based on their classes',
                updated: 0
            })
        }

        // Batch update instructors
        let updated = 0
        for (const update of updates) {
            const { error } = await sb
                .from('instructors')
                .update({ department: update.department })
                .eq('id', update.id)

            if (!error) updated++
        }

        return NextResponse.json({
            message: `Updated ${updated} instructor(s) with departments`,
            updated,
            details: updates.map(u => ({ id: u.id, department: u.department }))
        })

    } catch (error) {
        console.error('Auto-assign departments error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// GET endpoint to preview what would be assigned
export async function GET(req: NextRequest) {
    try {
        await requireAdmin()

        const sb = sbService()

        // Get all instructors without departments
        const { data: instructors, error: instError } = await sb
            .from('instructors')
            .select('id, full_name, department')
            .is('department', null)

        if (instError) {
            return NextResponse.json({ error: instError.message }, { status: 500 })
        }

        // Get all classes with instructor_id
        const { data: classes, error: classError } = await sb
            .from('classes')
            .select('instructor_id, code')
            .not('instructor_id', 'is', null)

        if (classError) {
            return NextResponse.json({ error: classError.message }, { status: 500 })
        }

        // Group classes by instructor
        const instructorClasses = new Map<string, string[]>()
        for (const c of classes ?? []) {
            if (!c.instructor_id || !c.code) continue
            if (!instructorClasses.has(c.instructor_id)) {
                instructorClasses.set(c.instructor_id, [])
            }
            instructorClasses.get(c.instructor_id)!.push(c.code)
        }

        // Preview assignments
        const preview: { id: string, name: string, department: string | null, classCodes: string[] }[] = []
        for (const inst of instructors ?? []) {
            const codes = instructorClasses.get(inst.id) ?? []
            const dept = codes.length > 0 ? inferDepartment(codes) : null
            preview.push({
                id: inst.id,
                name: inst.full_name,
                department: dept,
                classCodes: codes.slice(0, 5) // Show first 5 codes
            })
        }

        return NextResponse.json({
            total: instructors?.length ?? 0,
            assignable: preview.filter(p => p.department).length,
            preview
        })

    } catch (error) {
        console.error('Auto-assign preview error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
