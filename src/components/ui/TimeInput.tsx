'use client'

import React from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { ReactLenis } from 'lenis/react'

interface TimeInputProps {
    value: string
    onChange: (value: string) => void
    className?: string
    disabled?: boolean
}

export function TimeInput({ value, onChange, className, disabled }: TimeInputProps) {
    // Parse time value (HH:mm) to 12h format parts
    const { hours, minutes, period } = React.useMemo(() => {
        if (!value) return { hours: 12, minutes: 0, period: 'AM' }
        const [h, m] = value.split(':').map(Number)
        if (isNaN(h) || isNaN(m)) return { hours: 12, minutes: 0, period: 'AM' }

        const period = h >= 12 ? 'PM' : 'AM'
        const hours = h % 12 || 12
        return { hours, minutes: m, period }
    }, [value])

    const handleTimeChange = (newHours: number, newMinutes: number, newPeriod: string) => {
        let h = newHours
        if (newPeriod === 'PM' && h !== 12) h += 12
        if (newPeriod === 'AM' && h === 12) h = 0

        onChange(`${h.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`)
    }

    const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')} ${period}`

    const lenisOptions = {
        lerp: 0.12,
        duration: 1.2,
        smoothWheel: true,
        wheelMultiplier: 1.2
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <AnimatedActionBtn
                    label={value ? formattedTime : '--:-- --'}
                    icon={Clock}
                    variant="secondary"
                    className={cn("w-full justify-between px-3 font-mono", className)}
                    disabled={disabled}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-[240px] p-0"
                align="start"
            >
                <div className="flex h-48 overflow-hidden rounded-md divide-x divide-border">
                    {/* Hours Column */}
                    <div className="flex-1 min-w-[60px]">
                        <div className="px-1 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center bg-muted/50 border-b border-border">Hr</div>
                        <ReactLenis className="h-[calc(12rem-33px)] overflow-y-auto p-1" options={lenisOptions}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        handleTimeChange(h, minutes, period)
                                    }}
                                    className={cn(
                                        "w-full rounded-md px-1 py-1.5 text-sm font-medium text-center transition-colors hover:bg-accent hover:text-accent-foreground",
                                        hours === h && "bg-accent text-accent-foreground"
                                    )}
                                >
                                    {h}
                                </button>
                            ))}
                        </ReactLenis>
                    </div>

                    {/* Minutes Column */}
                    <div className="flex-1 min-w-[60px]">
                        <div className="px-1 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center bg-muted/50 border-b border-border">Min</div>
                        <ReactLenis className="h-[calc(12rem-33px)] overflow-y-auto p-1" options={lenisOptions}>
                            {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        handleTimeChange(hours, m, period)
                                    }}
                                    className={cn(
                                        "w-full rounded-md px-1 py-1.5 text-sm font-medium text-center transition-colors hover:bg-accent hover:text-accent-foreground",
                                        minutes === m && "bg-accent text-accent-foreground"
                                    )}
                                >
                                    {m.toString().padStart(2, '0')}
                                </button>
                            ))}
                        </ReactLenis>
                    </div>

                    {/* AM/PM Column */}
                    <div className="flex-1 min-w-[60px] bg-muted/10">
                        <div className="px-1 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center bg-muted/50 border-b border-border">Pd</div>
                        <div className="p-1 space-y-1">
                            {['AM', 'PM'].map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        handleTimeChange(hours, minutes, p)
                                    }}
                                    className={cn(
                                        "w-full rounded-md px-1 py-1.5 text-sm font-medium text-center transition-colors hover:bg-accent hover:text-accent-foreground",
                                        period === p && "bg-accent text-accent-foreground"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
