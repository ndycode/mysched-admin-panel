import React from 'react'
import { Virtuoso } from 'react-virtuoso'
import { SectionRow } from '../types'

type VirtualizedSectionListProps = {
    data: SectionRow[]
    loading?: boolean
    loadingLabel?: string
    isEmpty?: boolean
    emptyMessage?: string
    rowRenderer: (index: number, row: SectionRow) => React.ReactNode
    gridTemplate: string
    variant?: 'card' | 'embedded'
    columns?: string[]
    minWidthClass?: string
}

export function VirtualizedSectionList({
    data,
    loading,
    loadingLabel = 'Loading...',
    isEmpty,
    emptyMessage = 'No sections found.',
    rowRenderer,
    gridTemplate,
    variant = 'card',
    columns = ['Section #', 'Code', 'Class', 'Instructor', 'Time Slot', 'Room', 'Enrollment', 'Status', 'Actions'],
    minWidthClass = 'min-w-screen-md',
}: VirtualizedSectionListProps) {
    const containerClasses =
        variant === 'embedded'
            ? 'flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card'
            : 'flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm'

    return (
        <section className="flex h-full flex-col space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">{loadingLabel}</p> : null}

            <div className={containerClasses}>
                {/* Header */}
                <div
                    className={`grid items-center gap-4 border-b border-border bg-muted px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground ${minWidthClass}`}
                    style={{ gridTemplateColumns: gridTemplate }}
                >
                    {columns.map((label, index) => (
                        <div
                            key={label}
                            className={
                                index === columns.length - 1
                                    ? 'sticky right-0 z-10 -mr-6 border-l border-border bg-muted pl-4 pr-6 text-right'
                                    : ''
                            }
                        >
                            {label}
                        </div>
                    ))}
                </div>

                {/* List */}
                <div className="flex-1 bg-card">
                    {isEmpty && !loading ? (
                        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ) : (
                        <Virtuoso
                            useWindowScroll
                            data={data}
                            itemContent={(index, row) => (
                                <div className={`border-b border-border last:border-0 ${minWidthClass}`}>
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
