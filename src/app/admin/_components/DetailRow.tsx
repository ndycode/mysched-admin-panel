'use client'

import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/Skeleton'
import { fadeIn } from '@/lib/motion'

type DetailRowProps = {
    label: string
    value: React.ReactNode
    loading?: boolean
}

export function DetailRow({ label, value, loading }: DetailRowProps) {
    return (
        <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-1 sm:flex-row sm:gap-4"
        >
            <dt className="min-w-[120px] text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm text-foreground">
                {loading ? (
                    <Skeleton className="h-5 w-32" />
                ) : (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        {value ?? '-'}
                    </motion.span>
                )}
            </dd>
        </motion.div>
    )
}
