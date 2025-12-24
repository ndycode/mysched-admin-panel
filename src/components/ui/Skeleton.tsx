'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type SkeletonProps = {
    className?: string
}

function Skeleton({ className }: SkeletonProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={cn('relative overflow-hidden rounded-md bg-muted', className)}
        >
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 dark:via-white/10 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                }}
            />
        </motion.div>
    )
}

export { Skeleton }
