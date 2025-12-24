'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { DURATION } from '@/lib/motion'

export function SimpleAreaChart({ data, color }: { data: { value: number }[]; color: string }) {
    const points = useMemo(() => {
        if (!data.length) return ''
        const max = Math.max(...data.map((d) => d.value))
        const min = Math.min(...data.map((d) => d.value))
        const range = max - min || 1

        return data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 100 - ((d.value - min) / range) * 100
            return `${x},${y}`
        }).join(' ')
    }, [data])

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.STANDARD }}
            className="h-full w-full"
        >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <motion.path
                    d={`M0,100 ${points} 100,100 Z`}
                    fill="url(#gradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: DURATION.SLOW, delay: 0.2 }}
                />
                <motion.polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: DURATION.SLOW, ease: 'easeOut' }}
                />
            </svg>
        </motion.div>
    )
}
