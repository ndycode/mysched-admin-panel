'use client'

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion'

type DataPoint = {
    name: string
    value: number
    color: string
}

type SmoothDonutChartProps = {
    data: DataPoint[]
    height?: number
    innerRadius?: number
    outerRadius?: number
    animateKey?: number | string
}

// Helper to calculate arc path
function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(x, y, radius, endAngle)
    const end = polarToCartesian(x, y, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
    const d = [
        'M', start.x, start.y,
        'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ')
    return d
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    }
}

export function SmoothDonutChart({
    data,
    height = 200,
    innerRadius = 60,
    outerRadius = 90,
    animateKey
}: SmoothDonutChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

    const total = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data])
    const currentValue = hoveredIndex !== null ? data[hoveredIndex]?.value ?? 0 : total

    const count = useMotionValue(currentValue || 0)
    const rounded = useTransform(count, latest => Math.round(latest).toLocaleString())

    React.useEffect(() => {
        const controls = animate(count, currentValue || 0, { duration: 0.6, ease: 'easeOut' })
        return () => controls.stop()
    }, [count, currentValue, animateKey, hoveredIndex])

    const segments = useMemo(() => {
        let currentAngle = 0
        return data.map((item, index) => {
            if (total === 0) return null
            const angle = (item.value / total) * 360
            const gap = 4 // Gap in degrees
            const effectiveAngle = Math.max(angle - gap, 0.1) // Ensure at least a dot

            const startAngle = currentAngle
            const endAngle = currentAngle + effectiveAngle

            // Advance by full angle (including gap)
            currentAngle += angle

            // Calculate path for the arc (using stroke)
            // We use a radius exactly in the middle of inner and outer
            const radius = (innerRadius + outerRadius) / 2
            const strokeWidth = outerRadius - innerRadius
            const path = describeArc(100, 100, radius, startAngle, endAngle)

            return {
                ...item,
                startAngle,
                endAngle,
                path,
                strokeWidth,
                color: item.color // Expecting CSS variable or hex
            }
        }).filter(Boolean) as (DataPoint & { path: string, strokeWidth: number, startAngle: number, endAngle: number })[]
    }, [data, total, innerRadius, outerRadius])

    // Background track path (full circle)
    const trackPath = useMemo(() => {
        const radius = (innerRadius + outerRadius) / 2
        return describeArc(100, 100, radius, 0, 359.99)
    }, [innerRadius, outerRadius])

    if (total === 0) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No data
            </div>
        )
    }

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg
                viewBox="0 0 200 200"
                className="w-full h-full overflow-visible"
                style={{ transform: 'rotate(-90deg)' }}
            >
                {/* Background Track */}
                <path
                    d={trackPath}
                    fill="none"
                    stroke="var(--muted)" // Use muted color for track
                    strokeWidth={outerRadius - innerRadius}
                    className="opacity-10"
                />

                {segments.map((segment, i) => (
                    <motion.path
                        key={segment.name}
                        d={segment.path}
                        fill="none"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0, stroke: segment.color }}
                        animate={{
                            pathLength: 1,
                            opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.3,
                            strokeWidth: hoveredIndex === i ? segment.strokeWidth + 2 : segment.strokeWidth,
                            stroke: segment.color
                        }}
                        transition={{
                            pathLength: { duration: 0.8, ease: "easeOut", delay: i * 0.1 },
                            strokeWidth: { duration: 0.2 },
                            opacity: { duration: 0.2 },
                            stroke: { duration: 0.3 }
                        }}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="cursor-pointer transition-all"
                    />
                ))}
            </svg>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <AnimatePresence mode="wait">
                    {hoveredIndex !== null ? (
                        <motion.div
                            key="hover"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-center"
                        >
                            <div className="text-2xl font-bold text-foreground">
                                <motion.span>{rounded}</motion.span>
                            </div>
                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                {data[hoveredIndex].name.split(' ')[0]} {/* Show first word or short name */}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="total"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-center"
                        >
                            <div className="text-2xl font-bold text-foreground">
                                <motion.span>{rounded}</motion.span>
                            </div>
                            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                Total
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    )
}
