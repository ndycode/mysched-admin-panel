'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
    className?: string
    icon?: React.ElementType
}

export function Spinner({ className, icon: Icon = Loader2 }: SpinnerProps) {
    return (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className={cn('flex items-center justify-center', className)}
        >
            <Icon className={cn('h-4 w-4', className)} />
        </motion.div>
    )
}
