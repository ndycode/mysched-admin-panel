import React from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Row } from '../types'

type VirtualizedClassListProps = {
    data: Row[]
    loading?: boolean
    loadingLabel?: string
    isEmpty?: boolean
    emptyMessage?: string
    rowRenderer: (index: number, row: Row) => React.ReactNode
    gridTemplate: string
}

export function VirtualizedClassList({
    data,
    loading,
    loadingLabel = 'Loading...',
    isEmpty,
    emptyMessage = 'No records found.',
    rowRenderer,
    gridTemplate,
}: VirtualizedClassListProps) {
    return (
        <section className="flex h-full flex-col space-y-3">
            {loading ? <p className="text-sm text-gray-500">{loadingLabel}</p> : null}

            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {/* Header */}
                <div
                    className="grid items-center gap-4 border-b border-border bg-background px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    style={{ gridTemplateColumns: gridTemplate }}
                >
                    <div>Class Name</div>
                    <div>Code</div>
                    <div>Section</div>
                    <div>Instructor</div>
                    <div>Schedule</div>
                    <div>Room</div>
                    <div className="text-right">Status</div>
                    <div className="text-right"><span className="sr-only">Actions</span></div>
                </div>

                {/* List */}
                <div className="flex-1 bg-card">
                    {isEmpty && !loading ? (
                        <div className="flex h-40 items-center justify-center text-sm text-gray-500">
                            {emptyMessage}
                        </div>
                    ) : (
                        <Virtuoso
                            useWindowScroll
                            data={data}
                            itemContent={(index, row) => (
                                <div className="border-b border-border last:border-0">
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
