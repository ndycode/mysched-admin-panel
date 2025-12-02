import { ActionFilter, AuditLogApiRow, AuditLogRecord, DateRange, SortOption, TableFilter } from './types'

export const ACTION_OPTIONS: Array<{ value: ActionFilter; label: string }> = [
    { value: 'all', label: 'All Actions' },
    { value: 'INSERT', label: 'INSERT' },
    { value: 'UPDATE', label: 'UPDATE' },
    { value: 'DELETE', label: 'DELETE' },
]

export const TABLE_OPTIONS: Array<{ value: TableFilter; label: string }> = [
    { value: 'all', label: 'All Tables' },
    { value: 'users', label: 'Users' },
    { value: 'classes', label: 'Classes' },
    { value: 'sections', label: 'Sections' },
]

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
    { value: 'timestamp', label: 'Most Recent' },
    { value: 'user', label: 'By User' },
    { value: 'table', label: 'By Table' },
    { value: 'action', label: 'By Action' },
    { value: 'id', label: 'By ID' },
    { value: 'row', label: 'By Row ID' },
]

export const QUICK_RANGES: Array<{ label: string; compute: () => DateRange }> = [
    {
        label: 'Today',
        compute: () => {
            const today = new Date()
            return { start: toIsoStart(today), end: toIsoEnd(today) }
        },
    },
    {
        label: 'Last 7 days',
        compute: () => {
            const end = new Date()
            const start = new Date()
            start.setDate(start.getDate() - 6)
            return { start: toIsoStart(start), end: toIsoEnd(end) }
        },
    },
    {
        label: 'Last 30 days',
        compute: () => {
            const end = new Date()
            const start = new Date()
            start.setDate(start.getDate() - 29)
            return { start: toIsoStart(start), end: toIsoEnd(end) }
        },
    },
    {
        label: 'This month',
        compute: () => {
            const now = new Date()
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            return { start: toIsoStart(start), end: toIsoEnd(end) }
        },
    },
]

export function mapAuditLogRow(row: AuditLogApiRow, fallbackIndex: number): AuditLogRecord {
    const timestamp = row.at ?? row.created_at ?? null
    const timestampMs = timestamp ? new Date(timestamp).getTime() : null
    const action = (row.action ?? 'UNKNOWN').toUpperCase()

    return {
        id: typeof row.id === 'number' ? row.id : fallbackIndex,
        timestamp,
        timestampMs: Number.isFinite(timestampMs) ? (timestampMs as number) : null,
        userId: row.user_id ?? null,
        userName: row.user_name ?? null,
        tableName: row.table_name ?? null,
        action,
        rowId: row.row_id ?? null,
        details: normalizeDetails(row.details),
        createdAt: row.created_at ?? null,
    }
}

export function normalizeDetails(details: unknown): unknown {
    if (details === null || details === undefined) return null
    if (typeof details === 'string') {
        try {
            return JSON.parse(details)
        } catch {
            return details
        }
    }
    return details
}

export function compareLogs(a: AuditLogRecord, b: AuditLogRecord, sort: SortOption, direction: 'asc' | 'desc') {
    const directionFactor = direction === 'asc' ? 1 : -1
    const tieBreak = () => directionFactor * ((a.id ?? 0) - (b.id ?? 0))

    if (sort === 'timestamp') {
        const diff = (a.timestampMs ?? 0) - (b.timestampMs ?? 0)
        return diff !== 0 ? directionFactor * diff : tieBreak()
    }

    if (sort === 'id') {
        return directionFactor * ((a.id ?? 0) - (b.id ?? 0))
    }

    if (sort === 'user') {
        const aUser = (a.userName ?? a.userId ?? '').toLowerCase()
        const bUser = (b.userName ?? b.userId ?? '').toLowerCase()
        if (aUser !== bUser) return directionFactor * aUser.localeCompare(bUser)
        const ts = (a.timestampMs ?? 0) - (b.timestampMs ?? 0)
        return ts !== 0 ? directionFactor * ts : tieBreak()
    }

    if (sort === 'table') {
        const aTable = (a.tableName ?? '').toLowerCase()
        const bTable = (b.tableName ?? '').toLowerCase()
        if (aTable !== bTable) return directionFactor * aTable.localeCompare(bTable)
        const ts = (a.timestampMs ?? 0) - (b.timestampMs ?? 0)
        return ts !== 0 ? directionFactor * ts : tieBreak()
    }

    if (sort === 'action') {
        const aAction = (a.action ?? '').toLowerCase()
        const bAction = (b.action ?? '').toLowerCase()
        if (aAction !== bAction) return directionFactor * aAction.localeCompare(bAction)
        const ts = (a.timestampMs ?? 0) - (b.timestampMs ?? 0)
        return ts !== 0 ? directionFactor * ts : tieBreak()
    }

    if (sort === 'row') {
        const aRow = a.rowId ? String(a.rowId).toLowerCase() : ''
        const bRow = b.rowId ? String(b.rowId).toLowerCase() : ''
        if (aRow !== bRow) return directionFactor * aRow.localeCompare(bRow)
        const ts = (a.timestampMs ?? 0) - (b.timestampMs ?? 0)
        return ts !== 0 ? directionFactor * ts : tieBreak()
    }

    const ts = (a.timestampMs ?? 0) - (b.timestampMs ?? 0)
    return ts !== 0 ? directionFactor * ts : tieBreak()
}

export function isSameDay(timestampMs: number | null, compareTo: Date) {
    if (!timestampMs) return false
    const date = new Date(timestampMs)
    return (
        date.getFullYear() === compareTo.getFullYear() &&
        date.getMonth() === compareTo.getMonth() &&
        date.getDate() === compareTo.getDate()
    )
}

export function formatTimestamp(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
    }).format(date)
}

export function formatDetails(details: unknown): string {
    if (details === null || details === undefined) return 'No details'
    if (typeof details === 'string') return details
    if (Array.isArray(details)) return `${details.length} entries`
    if (typeof details === 'object') {
        const entries = Object.entries(details as Record<string, unknown>)
        if (entries.length === 0) return 'Empty'
        if (entries.length === 1) {
            const [key, value] = entries[0]
            return `${key}: ${summarizeValue(value)}`
        }
        return `${entries.length} fields changed`
    }
    return String(details)
}

export function formatDetailsTooltip(details: unknown): string | undefined {
    if (details === null || details === undefined) return undefined
    if (typeof details === 'string') return details
    try {
        return JSON.stringify(details, null, 2)
    } catch {
        return String(details)
    }
}

export function summarizeValue(value: unknown): string {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
}

export function prettyPrint(value: unknown): string {
    if (value === null || value === undefined) return 'No details provided.'
    if (typeof value === 'string') return value
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}

export function formatActionLabel(action: string | null): string {
    if (!action) return '—'
    const normalized = action.trim()
    if (!normalized) return '—'
    return `${normalized[0].toUpperCase()}${normalized.slice(1).toLowerCase()}`
}

export function formatDateRangeLabel(range: DateRange): string {
    const startLabel = formatDisplayDate(range.start)
    const endLabel = formatDisplayDate(range.end)
    if (startLabel && endLabel) {
        return `${startLabel} – ${endLabel}`
    }
    if (startLabel) {
        return `Since ${startLabel}`
    }
    if (endLabel) {
        return `Through ${endLabel}`
    }
    return 'Date Range'
}

export function formatDisplayDate(iso: string | null): string | null {
    if (!iso) return null
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return null
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

export function isoToInput(iso: string | null): string {
    if (!iso) return ''
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
}

export function inputToIso(value: string, mode: 'start' | 'end'): string | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    if (mode === 'start') {
        return toIsoStart(date)
    }
    return toIsoEnd(date)
}

export function toIsoStart(date: Date): string {
    const copy = new Date(date)
    copy.setHours(0, 0, 0, 0)
    return copy.toISOString()
}

export function toIsoEnd(date: Date): string {
    const copy = new Date(date)
    copy.setHours(23, 59, 59, 999)
    return copy.toISOString()
}
