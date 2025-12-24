'use client'

import { cn } from '@/lib/utils'

type ActiveBadgeProps = {
    className?: string
    children?: React.ReactNode
}

/**
 * Standardized "Active" badge used to indicate active semesters
 */
export function ActiveBadge({ className, children = 'Active' }: ActiveBadgeProps) {
    return (
        <span
            className={cn(
                'rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700',
                'dark:bg-emerald-500/20 dark:text-emerald-400',
                className
            )}
        >
            {children}
        </span>
    )
}
