'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

type DataPoint = {
    date: string
    value: number
    events?: {
        id: number
        action: string
        user: string
        time: string
    }[]
}

type SmoothAreaChartProps = {
    data: DataPoint[]
    color?: string
    height?: number
}

// Helper to generate smooth SVG path from points
function getSplinePath(points: [number, number][], isArea = false, height = 0) {
    if (points.length === 0) return ''

    // If we only have one point, just draw a line to it
    if (points.length === 1) {
        const [x, y] = points[0]
        if (isArea) {
            return `M0,${height} L${x},${y} L${x},${height} Z`
        }
        return `M${x},${y}`
    }

    // Catmull-Rom to Cubic Bezier conversion
    // For simplicity and performance, we'll use a simplified smoothing
    // that assumes uniform x-distribution which is true for our chart
    let d = `M ${points[0][0]} ${points[0][1]}`

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = points[i + 2] || p2

        const cp1x = p1[0] + (p2[0] - p0[0]) / 6
        const cp1y = p1[1] + (p2[1] - p0[1]) / 6

        const cp2x = p2[0] - (p3[0] - p1[0]) / 6
        const cp2y = p2[1] - (p3[1] - p1[1]) / 6

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`
    }

    if (isArea) {
        d += ` L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`
    }

    return d
}

export function SmoothAreaChart({ data, color = 'var(--primary)', height = 300 }: SmoothAreaChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

    const { path, areaPath, points } = useMemo(() => {
        if (!data.length) return { path: '', areaPath: '', points: [] }

        const max = Math.max(...data.map(d => d.value)) * 1.2 // Add some headroom
        const min = 0 // Always start from 0 for area charts

        const range = max - min || 1
        const stepX = 100 / (data.length - 1 || 1)

        const pts = data.map((d, i) => {
            const x = i * stepX
            // Invert Y because SVG 0 is top
            const y = 100 - ((d.value - min) / range) * 100
            return [x, y] as [number, number]
        })

        return {
            path: getSplinePath(pts),
            areaPath: getSplinePath(pts, true, 100),
            points: pts
        }
    }, [data])

    return (
        <div className="relative w-full h-full select-none" onMouseLeave={() => setHoveredIndex(null)}>
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible relative z-10"
            >
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>

                {/* Area Fill */}
                <motion.path
                    d={areaPath}
                    fill="url(#chartGradient)"
                    initial={false}
                    animate={{ d: areaPath }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />

                {/* Line Stroke */}
                <motion.path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={false}
                    animate={{ d: path }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    vectorEffect="non-scaling-stroke"
                    style={{ strokeWidth: '3px' }}
                />
            </svg >

            {/* Interactive Overlay */}
            < div className="absolute inset-0 flex items-end justify-between z-10" >
                {
                    data.map((item, i) => (
                        <div
                            key={i}
                            className="h-full flex-1 relative"
                            onMouseEnter={() => setHoveredIndex(i)}
                        />
                    ))
                }
            </div >

            {/* Tooltip Container */}
            {
                hoveredIndex !== null && data[hoveredIndex] && (
                    <motion.div
                        className="absolute top-0 bottom-0 w-px pointer-events-none z-20"
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: 1,
                            left: `${(hoveredIndex / (data.length - 1 || 1)) * 100}%`
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                        {/* Vertical Line */}
                        <div className="absolute top-0 bottom-0 left-0 w-px -translate-x-1/2 border-l border-dashed border-border" />

                        {/* Dot on the line */}
                        <div
                            className="absolute w-3 h-3 rounded-full border-2 border-background shadow-sm"
                            style={{
                                backgroundColor: color,
                                top: `${points[hoveredIndex][1]}%`,
                                left: '0',
                                transform: 'translate(-50%, -50%)'
                            }}
                        />

                        {/* Tooltip Box */}
                        <div
                            className="absolute left-0 -translate-x-1/2"
                            style={{
                                top: 0,
                                transform: 'translate(-50%, -100%) translateY(-10px)'
                            }}
                        >
                            <div className="bg-popover text-popover-foreground shadow-xl border border-border rounded-lg p-3 text-xs whitespace-nowrap min-w-[140px] z-50">
                                <div className="font-bold mb-1">{data[hoveredIndex].value} Events</div>
                                <div className="text-muted-foreground mb-2">{data[hoveredIndex].date}</div>

                                {data[hoveredIndex].events && data[hoveredIndex].events.length > 0 && (
                                    <div className="space-y-1 border-t border-border pt-2 mt-1">
                                        {data[hoveredIndex].events.slice(0, 3).map((e, i) => {
                                            const action = e.action.toLowerCase()
                                            const color = action === 'insert' ? 'bg-emerald-500' :
                                                action === 'update' ? 'bg-blue-500' :
                                                    action === 'delete' ? 'bg-red-500' :
                                                        action === 'error' ? 'bg-orange-500' : 'bg-muted-foreground'

                                            return (
                                                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
                                                    <div className="flex items-center gap-1 overflow-hidden">
                                                        <span className="font-medium text-foreground/90 leading-none capitalize truncate">{action}</span>
                                                        <span className="text-muted-foreground/60 leading-none truncate max-w-[80px]">by {e.user}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {data[hoveredIndex].value > 3 && (
                                            <div className="text-[9px] text-muted-foreground pt-0.5 italic">
                                                + {data[hoveredIndex].value - 3} more...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )
            }
        </div >
    )
}
