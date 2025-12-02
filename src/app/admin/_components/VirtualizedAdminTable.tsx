import React, { type ReactNode, useMemo } from 'react'
import { CARD_BASE } from './design-system'
import { TableVirtuoso } from 'react-virtuoso'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'

type VirtualizedAdminTableProps<T> = {
    data: T[]
    header: ReactNode
    rowContent: (index: number, data: T) => ReactNode
    getItemKey?: (index: number, data: T) => React.Key
    loading?: boolean
    loadingLabel?: ReactNode
    error?: string | null
    isEmpty?: boolean
    emptyMessage?: string | null
    colSpan: number
    pagination?: ReactNode
    minWidthClass?: string
}

export function VirtualizedAdminTable<T>({
    data,
    header,
    rowContent,
    getItemKey,
    loading = false,
    loadingLabel = <LoadingIndicator />,
    error = null,
    isEmpty = false,
    emptyMessage = 'No records found.',
    pagination,
    minWidthClass = 'min-w-screen-lg',
}: VirtualizedAdminTableProps<T>) {
    const showLoadingBanner = loading && data.length === 0
    const showErrorBanner = Boolean(error) && !loading && data.length === 0

    const components = useMemo(() => {
        return {
            Table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
                <table
                    {...props}
                    className={`${minWidthClass} relative w-full divide-y divide-border text-sm text-foreground`}
                />
            ),
            TableHead: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
                (props, ref) => <thead {...props} ref={ref} className="bg-muted/50" />,
            ),
            TableBody: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
                (props, ref) => <tbody {...props} ref={ref} className="divide-y divide-border" />,
            ),
            TableRow: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
                <tr
                    {...props}
                    className={`group hover:bg-muted/50 transition-colors ${props.className ?? ''}`}
                />
            ),
        }
    }, [minWidthClass])

    return (
        <section className="space-y-3">
            <div className={`${CARD_BASE} overflow-hidden`}>
                {showLoadingBanner ? (
                    <div className="px-6 py-12 text-center text-sm text-[var(--muted-foreground)]">
                        {loadingLabel}
                    </div>
                ) : showErrorBanner ? (
                    <div className="px-6 py-12 text-center text-sm text-destructive">
                        {error}
                    </div>
                ) : (
                    <>
                        <TableVirtuoso
                            useWindowScroll
                            data={data}
                            computeItemKey={getItemKey}
                            components={components}
                            fixedHeaderContent={() => header}
                            itemContent={(index, item) => {
                                const rendered = rowContent(index, item)
                                if (
                                    React.isValidElement<React.HTMLAttributes<HTMLTableRowElement>>(rendered) &&
                                    rendered.type === 'tr'
                                ) {
                                    return rendered.props.children
                                }
                                return rendered
                            }}
                        />

                        {isEmpty ? (
                            <div className="px-6 py-12 text-center text-sm text-[var(--muted-foreground)]">
                                {emptyMessage}
                            </div>
                        ) : null}
                    </>
                )}

                {pagination ? (
                    <div className="border-t border-border bg-background px-4 py-3 sm:px-6">{pagination}</div>
                ) : null}
            </div>
        </section>
    )
}

const components = {
    Table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
        <table
            {...props}
            className="min-w-full divide-y divide-[var(--border-soft)] text-sm text-[var(--muted-strong)]"
        />
    ),
    TableHead: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>((props, ref) => (
        <thead {...props} ref={ref} className="bg-background" />
    )),
    TableBody: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>((props, ref) => (
        <tbody {...props} ref={ref} className="divide-y divide-[var(--border-faint)]" />
    )),
}

components.TableHead.displayName = 'VirtualizedAdminTableHead'
components.TableBody.displayName = 'VirtualizedAdminTableBody'
