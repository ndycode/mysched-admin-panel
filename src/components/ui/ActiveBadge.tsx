'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type ActiveBadgeProps = {
    className?: string
    children?: React.ReactNode
}

/**
 * Standardized "Active" badge with pulse animation
 */
export function ActiveBadge({ className, children = 'Active' }: ActiveBadgeProps) {
    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.05 }}
            className={cn(
                'inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700',
                'dark:bg-emerald-500/20 dark:text-emerald-400',
                className
            )}
        >
            <motion.span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {children}
        </motion.span>
    )
}
