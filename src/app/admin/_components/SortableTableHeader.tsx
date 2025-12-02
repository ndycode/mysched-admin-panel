import { ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react'

type SortableTableHeaderProps<T extends string> = {
    sortKey: T
    label: string
    currentSort: string
    sortDirection: 'asc' | 'desc'
    userSorted: boolean
    onSortChange: (key: T) => void
}

export function SortableTableHeader<T extends string>({
    sortKey,
    label,
    currentSort,
    sortDirection,
    userSorted,
    onSortChange,
}: SortableTableHeaderProps<T>) {
    const isActive = currentSort === sortKey
    const showActive = userSorted && isActive

    const icon = !userSorted ? (
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
    ) : !showActive ? (
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
    ) : sortDirection === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5 text-foreground" aria-hidden />
    ) : (
        <ArrowDown className="h-3.5 w-3.5 text-foreground" aria-hidden />
    )

    return (
        <button
            type="button"
            onClick={() => onSortChange(sortKey)}
            className={`flex items-center gap-1.5 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${showActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
        >
            {label}
            {icon}
        </button>
    )
}
