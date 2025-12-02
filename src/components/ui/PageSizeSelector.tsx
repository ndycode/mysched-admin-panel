'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type PageSizeSelectorProps = {
    pageSize: number
    onPageSizeChange: (size: number) => void
    options?: number[]
}

export function PageSizeSelector({
    pageSize,
    onPageSizeChange,
    options = [10, 20, 50, 100],
}: PageSizeSelectorProps) {
    return (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Rows per page:</span>
            <div className="flex items-center gap-1">
                {options.map((option) => {
                    const isSelected = pageSize === option
                    return (
                        <motion.button
                            key={option}
                            onClick={() => onPageSizeChange(option)}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                                'relative flex h-7 min-w-[2.5rem] items-center justify-center rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                isSelected
                                    ? 'bg-accent text-accent-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            )}
                        >
                            {isSelected && (
                                <motion.div
                                    layoutId="pageSizeActive"
                                    className="absolute inset-0 rounded-md bg-accent"
                                    initial={false}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    style={{ zIndex: -1 }}
                                />
                            )}
                            <span className="relative z-10">{option}</span>
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}
