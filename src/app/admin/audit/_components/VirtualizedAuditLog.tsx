import React from 'react'
import { Virtuoso } from 'react-virtuoso'
import { AuditLogRecord } from '../types'
import { CARD_BASE } from '../../_components/design-system'

type VirtualizedAuditLogProps = {
    data: AuditLogRecord[]
    loading?: boolean
    loadingLabel?: string
    isEmpty?: boolean
    emptyMessage?: string
    rowRenderer: (index: number, row: AuditLogRecord) => React.ReactNode
    gridTemplate: string
    minWidthClass?: string
}

export function VirtualizedAuditLog({
    data,
    loading,
    loadingLabel = 'Loading...',
    isEmpty,
    emptyMessage = 'No records found.',
    rowRenderer,
    gridTemplate,
    minWidthClass = 'min-w-[1000px]',
}: VirtualizedAuditLogProps) {
    return (
        <section className="flex h-full flex-col space-y-3">
            {loading ? <p className="text-sm text-[var(--muted-foreground)]">{loadingLabel}</p> : null}

            <div className={`${CARD_BASE} flex flex-1 flex-col overflow-hidden`}>
                {/* Header */}
                <div
                    className={`grid items-center gap-4 border-b border-border bg-card px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground ${minWidthClass}`}
                    style={{ gridTemplateColumns: gridTemplate }}
                >
                    <div>ID</div>
                    <div>Timestamp</div>
                    <div>User ID</div>
                    <div>Action</div>
                    <div>Table</div>
                    <div>Row ID</div>
                    <div>Details</div>
                    <div className="sticky right-0 z-10 -mr-6 border-l border-border bg-background pl-4 pr-6 text-right">
                        Actions
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 bg-card">
                    {isEmpty && !loading ? (
                        <div className="flex h-40 items-center justify-center text-sm text-[var(--muted-foreground)]">
                            {emptyMessage}
                        </div>
                    ) : (
                        <Virtuoso
                            useWindowScroll
                            data={data}
                            itemContent={(index, row) => (
                                <div className={`border-b border-gray-100 last:border-0 ${minWidthClass}`}>
                                    {rowRenderer(index, row)}
                                </div>
                            )}
                        />
                    )}
                </div>
            </div>
        </section>
    )
}
