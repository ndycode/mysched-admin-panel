import { SectionApiRow, SectionRow, SectionStats } from './types'

export function mapSectionRow(row: SectionApiRow): SectionRow {
    const parseClassCount = (value: SectionApiRow['class_count']): number | null => {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : null
        }
        if (Array.isArray(value) && value.length) {
            const first = value[0]
            const countValue = typeof first?.count === 'string' ? Number(first.count) : first?.count
            return typeof countValue === 'number' && Number.isFinite(countValue) ? countValue : null
        }
        return null
    }

    const parseClassArrayCount = (value: SectionApiRow['classes']): number | null => {
        if (!Array.isArray(value)) return null
        const count = value.filter(entry => entry?.archived_at == null).length
        return Number.isFinite(count) ? count : null
    }

    const rawNumber = (row.section_number ?? '')?.toString().trim()
    const code = row.code ? String(row.code).trim() || null : null
    const sectionNumber = rawNumber || code || ''
    const id = typeof row.id === 'number' ? row.id : null
    const key = id !== null ? String(id) : (sectionNumber && sectionNumber.length ? sectionNumber : Math.random().toString(36).slice(2))
    const classCount = parseClassCount(row.class_count) ?? parseClassArrayCount(row.classes) ?? 0

    return {
        id,
        key,
        code,
        sectionNumber: sectionNumber || '-',
        semesterId: row.semester_id ?? null,
        semesterName: row.semesters?.name ?? null,
        semesterIsActive: row.semesters?.is_active ?? false,
        createdAt: row.created_at ?? null,
        updatedAt: row.updated_at ?? null,
        classCount,
    }
}

export function computeStats(rows: SectionRow[]): SectionStats {
    const totalSections = rows.length
    const totalClassCount = rows.reduce((sum, row) => {
        const count = typeof row.classCount === 'number' ? row.classCount : 0
        return Number.isFinite(count) ? sum + count : sum
    }, 0)
    const avgClasses = totalSections > 0 ? totalClassCount / totalSections : null
    const now = new Date()
    const addedThisMonth = rows.filter(row => {
        if (!row.createdAt) return false
        const date = new Date(row.createdAt)
        if (Number.isNaN(date.getTime())) return false
        return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth()
    }).length

    const lastUpdatedDate = rows.reduce<Date | null>((latest, row) => {
        if (!row.updatedAt) return latest
        const date = new Date(row.updatedAt)
        if (Number.isNaN(date.getTime())) return latest
        if (!latest || date > latest) return date
        return latest
    }, null)

    return {
        totalSections,
        addedThisMonth,
        avgClasses: Number.isFinite(avgClasses) ? avgClasses : null,
        lastUpdated: lastUpdatedDate ? lastUpdatedDate.toISOString() : null,
    }
}
