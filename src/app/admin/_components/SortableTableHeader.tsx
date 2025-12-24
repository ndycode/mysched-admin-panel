'use client'

import { motion, AnimatePresence } from 'framer-motion'
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

    return (
        <motion.button
            type="button"
            onClick={() => onSortChange(sortKey)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-1.5 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${showActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
        >
            {label}
            <AnimatePresence mode="wait">
                {!userSorted ? (
                    <motion.span
                        key="unsorted"
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        exit={{ opacity: 0, rotate: 90 }}
                        transition={{ duration: 0.15 }}
                    >
                        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    </motion.span>
                ) : !showActive ? (
                    <motion.span
                        key="inactive"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                    </motion.span>
                ) : sortDirection === 'asc' ? (
                    <motion.span
                        key="asc"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                    >
                        <ArrowUp className="h-3.5 w-3.5 text-foreground" aria-hidden />
                    </motion.span>
                ) : (
                    <motion.span
                        key="desc"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                    >
                        <ArrowDown className="h-3.5 w-3.5 text-foreground" aria-hidden />
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    )
}
