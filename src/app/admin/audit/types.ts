export type AuditLogApiRow = {
    id?: number
    at?: string | null
    created_at?: string | null
    user_id?: string | null
    user_name?: string | null
    table_name?: string | null
    action?: string | null
    row_id?: number | string | null
    details?: unknown
}

export type AuditLogRecord = {
    id: number
    timestamp: string | null
    timestampMs: number | null
    userId: string | null
    userName: string | null
    tableName: string | null
    action: string
    rowId: number | string | null
    details: unknown
    createdAt: string | null
}

export type ActionFilter = 'all' | 'INSERT' | 'UPDATE' | 'DELETE'
export type TableFilter = 'all' | 'users' | 'classes' | 'sections'
export type SortOption = 'timestamp' | 'user' | 'table' | 'action' | 'id' | 'row'
export type DetailState = { log: AuditLogRecord; mode: 'summary' | 'json' } | null
export type DateRange = { start: string | null; end: string | null }
